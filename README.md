# CampusMind

An AI-powered college assistant that uses **Retrieval-Augmented Generation (RAG)** to answer student queries from uploaded campus documents. CampusMind enables students to ask questions in natural language and receive accurate, context-aware responses based only on the institution's knowledge base.

---

## Features

- 🤖 AI-powered chatbot for campus-related queries
- 📄 Upload and index PDF documents into a searchable knowledge base
- 🔍 Retrieval-Augmented Generation (RAG) using ChromaDB
- 🧠 Context-aware responses powered by Groq's Llama 3.3 70B model
- 💬 Multi-turn conversation with chat history
- 📚 Document management (view and delete indexed documents)
- 📝 Markdown-formatted responses for better readability
- 🌐 Responsive web interface built with Flask

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Python | Backend |
| Flask | Web Framework |
| Groq API | Large Language Model |
| ChromaDB | Vector Database |
| Sentence Transformers | Text Embeddings |
| PyPDF | PDF Parsing |
| HTML, CSS, JavaScript | Frontend |

---

## Project Structure

```
CampusMind/
│
├── static/
├── templates/
├── chroma_data/
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
└── .env (not included)
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/DhruvVerma26/CampusMind.git
cd CampusMind
```

### 2. Create a virtual environment

```bash
python -m venv venv
```

Activate it:

**Windows**

```bash
venv\Scripts\activate
```

**Linux / macOS**

```bash
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create a `.env` file

Create a file named `.env` in the project folder and add:

```text
GROQ_API_KEY=your_groq_api_key
FLASK_SECRET_KEY=your_secret_key
```

### 5. Run the application

```bash
python app.py
```

The application will start at:

```
http://localhost:8080
```

---

## Usage

### Chat Interface

Open:

```
http://localhost:8080
```

Ask campus-related questions based on the uploaded documents.

### Admin Panel

Open:

```
http://localhost:8080/admin
```

From here you can:

- Upload PDF documents
- Build the knowledge base
- Manage indexed documents

---

## How It Works

1. Upload campus PDF documents.
2. PDFs are parsed into text chunks.
3. Chunks are converted into embeddings using Sentence Transformers.
4. Embeddings are stored in ChromaDB.
5. When a user asks a question, the most relevant document chunks are retrieved.
6. The retrieved context is sent to the Groq LLM.
7. CampusMind generates an accurate response based only on the retrieved information.

---

## Future Improvements

- User authentication
- Faculty and timetable integration
- Voice input and speech output
- Multi-language support
- Cloud deployment
- Advanced search filters

---

## Author

**Dhruv**

---

## License

This project is intended for educational and portfolio purposes.