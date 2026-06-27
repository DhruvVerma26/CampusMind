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

1. **Professor/Admin uploads campus documents**

   * Faculty or administrators upload PDF documents such as academic regulations, course handbooks, timetables, fee structures, examination guidelines, and other campus resources through the Admin Dashboard.

2. **Document processing**

   * CampusMind extracts text from the uploaded PDFs and divides the content into smaller, meaningful chunks for efficient retrieval.

3. **Knowledge base creation**

   * Each text chunk is converted into vector embeddings using Sentence Transformers and stored in ChromaDB, creating a searchable knowledge base.

4. **Student asks a question**

   * Students interact with CampusMind through the chat interface by asking natural language questions about campus information.

5. **Relevant information retrieval**

   * CampusMind searches the vector database to identify the most relevant document chunks related to the student's query.

6. **AI response generation**

   * The retrieved context is provided to the Groq-powered Llama 3.3 language model, which generates a response strictly based on the uploaded campus documents.

7. **Context-aware answers**

   * The chatbot returns an accurate, well-structured response along with references to the source documents used to answer the query. If the required information is not available in the uploaded documents, CampusMind informs the user instead of generating unsupported information.


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

**Dhruv Verma**

---

## License

This project is intended for educational and portfolio purposes.
