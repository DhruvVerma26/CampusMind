import os
import uuid
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template, session
from groq import Groq
import chromadb
from chromadb.utils import embedding_functions
from pypdf import PdfReader
from werkzeug.utils import secure_filename
load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "super-secret-dev-key")

# 1. Initialize Groq Client
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is not set.")

client = Groq(api_key=GROQ_API_KEY)

# 2. Setup ChromaDB & Embedding Function
# Saves database files locally in the chroma_data directory
chroma_client = chromadb.PersistentClient(path="./chroma_data")

# Using a standard lightweight sentence-transformer model for local embeddings
huggingface_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

# Get or create the collection where documents are stored
collection = chroma_client.get_or_create_collection(
    name="knowledge_base", 
    embedding_function=huggingface_ef
)

# Text chunking helper
def chunk_text(text, chunk_size=800, overlap=100):
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        if end < len(text):
            last_space = text.rfind(' ', start, end)
            if last_space > start + chunk_size // 2:
                end = last_space
        chunks.append(text[start:end].strip())
        start = end - overlap
        if start < 0 or start >= len(text) or end >= len(text):
            break
    return chunks

# PDF Parsing & Indexing helper
def parse_pdf_and_index(file_path, filename, category):
    try:
        reader = PdfReader(file_path)
        total_pages = len(reader.pages)
        chunks_indexed = 0
        
        for page_idx in range(total_pages):
            page = reader.pages[page_idx]
            page_text = page.extract_text()
            if not page_text or not page_text.strip():
                continue
            
            page_chunks = chunk_text(page_text, chunk_size=800, overlap=100)
            
            for chunk_idx, chunk in enumerate(page_chunks):
                # Include UUID to prevent ID collision across documents with same length
                chunk_id = f"{filename}_p{page_idx + 1}_c{chunk_idx}_{str(uuid.uuid4())[:8]}"
                collection.add(
                    documents=[chunk],
                    metadatas=[{
                        "source": filename,
                        "category": category,
                        "page": page_idx + 1,
                        "chunk_index": chunk_idx
                    }],
                    ids=[chunk_id]
                )
                chunks_indexed += 1
        return True, total_pages, chunks_indexed
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return False, 0, 0

@app.route('/')
def index():
    session['chat_history'] = []
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json or {}
    user_message = data.get("message")
    
    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    # Retrieve history from request body (sent by the frontend) or fallback to server session
    history = data.get("history")
    if history is None:
        history = session.get('chat_history', [])

    # RAG Step: Query ChromaDB for relevant context
    try:
        results = collection.query(
            query_texts=[user_message],
            n_results=4  # Retrieve slightly more context for quality synthesis
        )
        retrieved_docs = results.get("documents", [[]])[0]
        retrieved_metadatas = results.get("metadatas", [[]])[0]
        
        # Flatten documents and extract unique sources
        context_parts = []
        sources = []
        for doc, meta in zip(retrieved_docs, retrieved_metadatas):
            context_parts.append(doc)
            if meta and "source" in meta:
                source_str = f"{meta['source']} (Page {meta.get('page', 1)})"
                if source_str not in sources:
                    sources.append(source_str)
                    
        context = "\n\n".join(context_parts) if context_parts else "No specific documents found."
    except Exception as e:
        print(f"ChromaDB Query Error: {e}")
        context = "Error retrieving background context."
        sources = []

    # Construct System Prompt with Context
    system_prompt = f"""You are CampusMind, a highly intelligent college AI assistant.
Answer the user's question using ONLY the provided campus document context below.
If the answer cannot be found in the context, say "I'm sorry, but I couldn't find that information in the uploaded campus documents."
Provide a friendly, direct, and well-structured response using markdown formatting (bolding, lists, tables) where appropriate.

Context:
{context}"""

    # Prepare Messages Payload
    messages = [{"role": "system", "content": system_prompt}]
    
    # Append the historical conversation
    cleaned_history = []
    for msg in history:
        if isinstance(msg, dict) and "role" in msg and "content" in msg:
            # map 'bot' role from frontend if needed to 'assistant' for LLM
            role = msg["role"]
            if role == "bot":
                role = "assistant"
            cleaned_history.append({"role": role, "content": msg["content"]})
            
    messages.extend(cleaned_history)
    
    # Append the new user message
    messages.append({"role": "user", "content": user_message})

    try:
        # Call Groq with RAG-enriched payload
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.3,  # Lower temperature matches strict context adherence
            max_tokens=1024
        )
        bot_reply = completion.choices[0].message.content
        
        # Update session history (for clients not passing history parameters)
        session_history = session.get('chat_history', [])
        session_history.append({"role": "user", "content": user_message})
        session_history.append({"role": "assistant", "content": bot_reply})
        if len(session_history) > 10:
            session_history = session_history[-10:]
        session['chat_history'] = session_history

        return jsonify({
            "reply": bot_reply, 
            "sources": sources
        })

    except Exception as e:
        print(f"Groq API Error: {e}")
        return jsonify({"error": f"API Error: {str(e)}"}), 500

# Route to process PDF uploads
@app.route('/upload_pdfs', methods=['POST'])
def upload_pdfs():
    if 'files' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    files = request.files.getlist('files')
    category = request.form.get('category', 'General')
    
    if not files or files[0].filename == '':
        return jsonify({"error": "No files selected"}), 400
        
    temp_dir = os.path.join(app.root_path, 'temp_uploads')
    os.makedirs(temp_dir, exist_ok=True)
    
    successful_uploads = []
    errors = []
    
    for file in files:
        if file and file.filename.lower().endswith('.pdf'):
            filename = secure_filename(file.filename)
            temp_path = os.path.join(temp_dir, filename)
            try:
                # Save file temporarily
                file.save(temp_path)
                
                # Parse and index
                success, total_pages, chunks = parse_pdf_and_index(temp_path, filename, category)
                
                if success:
                    successful_uploads.append({
                        "filename": filename,
                        "pages": total_pages,
                        "chunks": chunks
                    })
                else:
                    errors.append(f"Failed to parse {filename}")
            except Exception as e:
                errors.append(f"Error processing {filename}: {str(e)}")
            finally:
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
        else:
            errors.append(f"Skipping '{file.filename}': Only PDF files are allowed")
            
    # Clean up temp directory if empty
    try:
        if os.path.exists(temp_dir) and not os.listdir(temp_dir):
            os.rmdir(temp_dir)
    except Exception:
        pass
        
    if errors and not successful_uploads:
        return jsonify({"error": "; ".join(errors)}), 400
        
    status_msg = f"Successfully processed {len(successful_uploads)} documents."
    if errors:
        status_msg += f" Note: {len(errors)} errors occurred."
        
    return jsonify({
        "status": status_msg,
        "details": successful_uploads,
        "errors": errors
    })

# Route to list indexed files in ChromaDB
@app.route('/documents', methods=['GET'])
def list_documents():
    try:
        results = collection.get(include=["metadatas"])
        metadatas = results.get("metadatas", [])
        
        docs_dict = {}
        for meta in metadatas:
            if not meta or "source" not in meta:
                continue
            source = meta["source"]
            category = meta.get("category", "General")
            page = meta.get("page", 1)
            
            if source not in docs_dict:
                docs_dict[source] = {
                    "filename": source,
                    "category": category,
                    "chunks": 0,
                    "pages": set()
                }
            docs_dict[source]["chunks"] += 1
            docs_dict[source]["pages"].add(page)
            
        docs_list = []
        for doc in docs_dict.values():
            docs_list.append({
                "filename": doc["filename"],
                "category": doc["category"],
                "chunks": doc["chunks"],
                "pages": len(doc["pages"])
            })
            
        return jsonify({"documents": docs_list})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Route to delete document from ChromaDB
@app.route('/documents/<path:filename>', methods=['DELETE'])
def delete_document(filename):
    try:
        collection.delete(where={"source": filename})
        return jsonify({"status": f"Successfully deleted '{filename}' from knowledge base."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admin')
def admin():
    return render_template('admin.html')

if __name__ == '__main__':
    app.run(debug=True, port=8080)
