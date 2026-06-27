// CampusMind Chatbot Frontend Application Core

// State Variables
let chats = [];
let activeChatId = null;
let settings = {
    theme: 'dark',
    userName: 'User',
    systemInstruction: 'Answer strictly using context.'
};

// Speech recognition setup (optional, checks support)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
}

// Current reading voice instance
let currentUtterance = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadChats();
    setupEventListeners();
    applyTheme(settings.theme);
});

// Load Settings from LocalStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('campusmind_settings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    }
}

// Save Settings to LocalStorage
function saveSettings() {
    localStorage.setItem('campusmind_settings', JSON.stringify(settings));
}

// Load Chat History from LocalStorage
function loadChats() {
    const savedChats = localStorage.getItem('campusmind_chats');
    const savedActiveId = localStorage.getItem('campusmind_active_chat_id');
    
    if (savedChats) {
        chats = JSON.parse(savedChats);
    }
    
    if (savedActiveId && chats.some(c => c.id == savedActiveId)) {
        activeChatId = savedActiveId;
    } else if (chats.length > 0) {
        activeChatId = chats[0].id;
    } else {
        createNewChat();
    }
    
    renderSidebar();
    renderActiveChat();
}

// Save Chat State to LocalStorage
function saveChatsState() {
    localStorage.setItem('campusmind_chats', JSON.stringify(chats));
    localStorage.setItem('campusmind_active_chat_id', activeChatId);
}

// Create a New Chat Session
function createNewChat() {
    const newId = 'chat_' + Date.now();
    const newChat = {
        id: newId,
        title: 'New Conversation',
        messages: [],
        model: 'llama-3.3 (RAG)',
        created: new Date().toISOString()
    };
    
    chats.unshift(newChat);
    activeChatId = newId;
    saveChatsState();
    renderSidebar();
    renderActiveChat();
}

// Render the Conversations Sidebar
function renderSidebar() {
    const historyContainer = document.getElementById('chat-history');
    if (!historyContainer) return;
    
    historyContainer.innerHTML = '';
    
    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `history-item ${chat.id === activeChatId ? 'active' : ''}`;
        item.setAttribute('data-id', chat.id);
        
        // Message preview or default title
        const displayTitle = chat.title || 'Untitled Conversation';
        
        item.innerHTML = `
            <div class="history-title-container" onclick="switchChat('${chat.id}')">
                <i class="far fa-comments"></i>
                <span class="history-title" id="title-text-${chat.id}">${escapeHtml(displayTitle)}</span>
            </div>
            <div class="history-actions">
                <button class="history-action-btn edit-btn" onclick="startRenameChat(event, '${chat.id}')" title="Rename">
                    <i class="far fa-edit"></i>
                </button>
                <button class="history-action-btn delete-btn" onclick="deleteChat(event, '${chat.id}')" title="Delete">
                    <i class="far fa-trash-alt"></i>
                </button>
            </div>
        `;
        
        historyContainer.appendChild(item);
    });
}

// Switch Active Chat
function switchChat(chatId) {
    if (chatId === activeChatId) return;
    
    // Stop any speech speaking
    window.speechSynthesis.cancel();
    
    activeChatId = chatId;
    saveChatsState();
    renderSidebar();
    renderActiveChat();
    
    // Auto-focus input
    document.getElementById('user-input').focus();
}

// Start renaming a conversation
function startRenameChat(event, chatId) {
    event.stopPropagation();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    const titleSpan = document.getElementById(`title-text-${chatId}`);
    const currentTitle = chat.title;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'history-edit-input';
    input.value = currentTitle;
    
    // Handle rename completion
    const finishRename = () => {
        const newTitle = input.value.trim() || currentTitle;
        chat.title = newTitle;
        saveChatsState();
        renderSidebar();
    };
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) finishRename();
        if (e.key === 'Escape') renderSidebar(); // Cancel
    });
    
    input.addEventListener('blur', finishRename);
    
    titleSpan.parentNode.replaceChild(input, titleSpan);
    input.focus();
    input.select();
}

// Delete Chat
function deleteChat(event, chatId) {
    event.stopPropagation();
    
    // Confirm delete
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    
    const index = chats.findIndex(c => c.id === chatId);
    if (index === -1) return;
    
    chats.splice(index, 1);
    
    if (activeChatId === chatId) {
        if (chats.length > 0) {
            activeChatId = chats[0].id;
        } else {
            activeChatId = null;
            createNewChat();
            return;
        }
    }
    
    saveChatsState();
    renderSidebar();
    renderActiveChat();
}

// Render Active Chat Window
function renderActiveChat() {
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return;
    
    const activeChat = chats.find(c => c.id === activeChatId);
    
    if (!activeChat || activeChat.messages.length === 0) {
        // Render Empty State
        chatBox.innerHTML = `
            <div class="empty-state">
                <div class="welcome-logo">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <h1 class="welcome-title">CampusMind AI Assistant</h1>
                <p class="welcome-subtitle">Get immediate answers about course syllabi, calendars, exam dates, grading policies, and guidelines uploaded by your professors.</p>
                <div class="starter-prompts">
                    <div class="prompt-card" onclick="insertPrompt('When is the mid-term exam schedule?')">
                        <div class="prompt-card-title">📅 Exam Schedule</div>
                        <div class="prompt-card-desc">Find dates, times, and locations of exams.</div>
                    </div>
                    <div class="prompt-card" onclick="insertPrompt('What is the grading policy and marks distribution for this course?')">
                        <div class="prompt-card-title">📚 Grading Criteria</div>
                        <div class="prompt-card-desc">Check grading brackets and weights of assignments.</div>
                    </div>
                    <div class="prompt-card" onclick="insertPrompt('Are there any assignment deadlines in the current syllabus?')">
                        <div class="prompt-card-title">📝 Assignment Deadlines</div>
                        <div class="prompt-card-desc">Look up due dates for homeworks or lab reports.</div>
                    </div>
                    <div class="prompt-card" onclick="insertPrompt('What are the office hours for the professor?')">
                        <div class="prompt-card-title">📍 Office Hours</div>
                        <div class="prompt-card-desc">Find when and where to meet your course instructor.</div>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    // Render Messages
    let htmlContent = '<div class="chat-inner">';
    
    activeChat.messages.forEach((msg, idx) => {
        const isBot = msg.role === 'bot';
        const formattedContent = isBot ? parseMarkdown(msg.content) : escapeHtml(msg.content);
        const timestamp = msg.timestamp || formatTime(new Date());
        
        // Bot RAG source links
        let sourcesHtml = '';
        if (isBot && msg.sources && msg.sources.length > 0) {
            sourcesHtml = '<div class="sources-container">';
            msg.sources.forEach((source) => {
                sourcesHtml += `
                    <div class="source-badge" title="${escapeHtml(source)}">
                        <i class="fas fa-file-pdf"></i> ${escapeHtml(source)}
                    </div>
                `;
            });
            sourcesHtml += '</div>';
        }
        
        // Voice reading action button on bot messages
        let actionButtons = '';
        if (isBot) {
            actionButtons = `
                <div class="message-actions">
                    <button class="msg-action-btn speech-btn" onclick="speakMessage(this, ${idx})" title="Read Aloud">
                        <i class="fas fa-volume-up"></i> Listen
                    </button>
                    <button class="msg-action-btn copy-msg-btn" onclick="copyTextMessage('${escapeJsString(msg.content)}')" title="Copy Text">
                        <i class="far fa-copy"></i> Copy
                    </button>
                </div>
            `;
        }
        
        htmlContent += `
            <div class="message ${isBot ? 'bot-msg' : 'user-msg'}">
                <div class="message-avatar ${isBot ? 'bot-avatar-msg' : 'user-avatar'}">
                    ${isBot ? '<i class="fas fa-university"></i>' : '<i class="far fa-user"></i>'}
                </div>
                <div class="message-body">
                    <div class="message-meta">
                        <span>${isBot ? 'CampusMind' : 'You'}</span>
                        <span>•</span>
                        <span>${timestamp}</span>
                    </div>
                    <div class="message-content">
                        ${formattedContent}
                    </div>
                    ${sourcesHtml}
                    ${actionButtons}
                </div>
            </div>
        `;
    });
    
    htmlContent += '</div>';
    chatBox.innerHTML = htmlContent;
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Insert Starter Prompt
function insertPrompt(text) {
    const input = document.getElementById('user-input');
    input.value = text;
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
    input.focus();
}

// Send Message
async function sendMessage() {
    const inputField = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');
    const typingIndicator = document.getElementById('typing-indicator');
    
    const text = inputField.value.trim();
    if (!text) return;
    
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat) return;
    
    // Disable inputs while working
    inputField.disabled = true;
    sendButton.disabled = true;
    
    // Add user message to state
    const userMsg = {
        role: 'user',
        content: text,
        timestamp: formatTime(new Date())
    };
    activeChat.messages.push(userMsg);
    
    // Auto rename chat title if it is default
    if (activeChat.messages.length === 1 || activeChat.title === 'New Conversation') {
        activeChat.title = text.length > 25 ? text.substring(0, 22) + '...' : text;
    }
    
    // Render immediate changes
    renderSidebar();
    renderActiveChat();
    
    // Reset inputs
    inputField.value = '';
    inputField.style.height = '24px';
    
    // Show typing state
    typingIndicator.style.display = 'inline-flex';
    const chatBox = document.getElementById('chat-box');
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // Prepare API history payload (past messages mapping assistant/user roles)
    const historyPayload = activeChat.messages.slice(0, -1).map(msg => ({
        role: msg.role === 'bot' ? 'assistant' : 'user',
        content: msg.content
    }));
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                history: historyPayload
            })
        });
        
        const data = await response.json();
        typingIndicator.style.display = 'none';
        
        if (response.ok && data.reply) {
            // Add bot reply to state
            const botMsg = {
                role: 'bot',
                content: data.reply,
                timestamp: formatTime(new Date()),
                sources: data.sources || []
            };
            activeChat.messages.push(botMsg);
        } else {
            // Add server-side errors
            const errMsg = {
                role: 'bot',
                content: `**Error:** ${data.error || 'Unable to retrieve answer.'}`,
                timestamp: formatTime(new Date())
            };
            activeChat.messages.push(errMsg);
        }
        
    } catch (err) {
        typingIndicator.style.display = 'none';
        console.error(err);
        
        // Add network error message
        const netErrMsg = {
            role: 'bot',
            content: `**Connection Error:** Failed to communicate with the CampusMind server. Is it running?`,
            timestamp: formatTime(new Date())
        };
        activeChat.messages.push(netErrMsg);
    }
    
    // Re-enable inputs & save
    inputField.disabled = false;
    sendButton.disabled = false;
    inputField.focus();
    
    saveChatsState();
    renderActiveChat();
}

// Dictation (Speech to Text)
function toggleVoiceInput() {
    if (!recognition) {
        alert('Voice dictation is not supported by your current browser. Try Chrome or Edge.');
        return;
    }
    
    const micBtn = document.getElementById('mic-btn');
    const inputField = document.getElementById('user-input');
    
    if (micBtn.classList.contains('active')) {
        recognition.stop();
        return;
    }
    
    micBtn.classList.add('active');
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        inputField.value += (inputField.value ? ' ' : '') + transcript;
        inputField.style.height = 'auto';
        inputField.style.height = inputField.scrollHeight + 'px';
    };
    
    recognition.onend = () => {
        micBtn.classList.remove('active');
    };
    
    recognition.onerror = (e) => {
        console.error('Speech recognition error:', e);
        micBtn.classList.remove('active');
    };
    
    recognition.start();
}

// Speak AI Response (Text to Speech)
function speakMessage(button, messageIdx) {
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat) return;
    
    const msg = activeChat.messages[messageIdx];
    if (!msg || msg.role !== 'bot') return;
    
    // If already speaking this message, cancel it
    if (button.classList.contains('speaking')) {
        window.speechSynthesis.cancel();
        button.innerHTML = '<i class="fas fa-volume-up"></i> Listen';
        button.classList.remove('speaking');
        return;
    }
    
    // Cancel any current utterances running
    window.speechSynthesis.cancel();
    document.querySelectorAll('.speech-btn').forEach(btn => {
        btn.innerHTML = '<i class="fas fa-volume-up"></i> Listen';
        btn.classList.remove('speaking');
    });
    
    // Clean text from markdown formatting
    const rawText = msg.content
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/```[\s\S]*?```/g, '[Code Block]');
        
    currentUtterance = new SpeechSynthesisUtterance(rawText);
    button.innerHTML = '<i class="fas fa-stop"></i> Stop';
    button.classList.add('speaking');
    
    currentUtterance.onend = () => {
        button.innerHTML = '<i class="fas fa-volume-up"></i> Listen';
        button.classList.remove('speaking');
    };
    
    currentUtterance.onerror = () => {
        button.innerHTML = '<i class="fas fa-volume-up"></i> Listen';
        button.classList.remove('speaking');
    };
    
    window.speechSynthesis.speak(currentUtterance);
}

// Copy Text to Clipboard
function copyTextMessage(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Message text copied to clipboard.');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Copy code blocks
function copyCode(button, base64Code) {
    const code = atob(base64Code);
    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Could not copy code:', err);
    });
}

// Export Chat History (Markdown / JSON)
function exportChat(format) {
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat || activeChat.messages.length === 0) {
        alert('No messages to export.');
        return;
    }
    
    let content = '';
    let mimeType = 'text/plain';
    let fileExtension = 'txt';
    
    if (format === 'json') {
        content = JSON.stringify(activeChat, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
    } else {
        // Export Markdown
        content = `# Chat: ${activeChat.title}\nDate Created: ${activeChat.created}\n\n`;
        activeChat.messages.forEach(msg => {
            const roleName = msg.role === 'bot' ? 'CampusMind AI' : 'User';
            content += `### ${roleName} (${msg.timestamp})\n${msg.content}\n\n`;
            if (msg.sources && msg.sources.length > 0) {
                content += `*Sources retrieved:*\n`;
                msg.sources.forEach(src => {
                    content += `> ${src}\n`;
                });
                content += `\n`;
            }
            content += `---\n\n`;
        });
        mimeType = 'text/markdown';
        fileExtension = 'md';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeChat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Clear active conversation
function clearActiveChatHistory() {
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat || activeChat.messages.length === 0) return;
    
    if (confirm('Clear all messages in this conversation?')) {
        activeChat.messages = [];
        saveChatsState();
        renderActiveChat();
    }
}

// Simple Custom Markdown and Code Blocks Parser
function parseMarkdown(text) {
    // Escape standard html tags to block scripts injection (except already formatted tags)
    let parsed = escapeHtml(text);
    
    // Code blocks parser ```language \n code ```
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    parsed = parsed.replace(codeBlockRegex, (match, lang, code) => {
        const cleanLang = lang.trim() || 'code';
        const cleanCode = code.trim();
        const base64Code = btoa(unescape(encodeURIComponent(cleanCode)));
        
        return `
            <div class="code-block-wrapper">
                <div class="code-block-header">
                    <span>${cleanLang.toUpperCase()}</span>
                    <button class="copy-code-btn" onclick="copyCode(this, '${base64Code}')">
                        <i class="far fa-copy"></i> Copy code
                    </button>
                </div>
                <pre><code class="language-${cleanLang}">${cleanCode}</code></pre>
            </div>
        `;
    });
    
    // Inline code blocks `code`
    parsed = parsed.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold **text**
    parsed = parsed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italic *text*
    parsed = parsed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Muted citations or blocks
    parsed = parsed.replace(/^&gt;\s+(.*)$/gm, '<blockquote>$1</blockquote>');
    
    // Bullet points lists
    parsed = parsed.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
    // Wrap groups of li into ul
    parsed = parsed.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');
    
    // Handle double spacing linebreaks
    parsed = parsed.replace(/\n\n/g, '</p><p>');
    parsed = parsed.replace(/\n/g, '<br>');
    
    return `<p>${parsed}</p>`;
}

// Theme management
function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    
    // Update theme switcher buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.getAttribute('data-theme') === themeName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function selectTheme(themeName) {
    settings.theme = themeName;
    saveSettings();
    applyTheme(themeName);
}

// Event Listeners Configuration
function setupEventListeners() {
    // Collapsible Sidebar
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    if (toggleSidebarBtn && sidebar) {
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            const icon = toggleSidebarBtn.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.className = 'fas fa-indent';
            } else {
                icon.className = 'fas fa-outdent';
            }
        });
    }
    
    // Auto expansion text field
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Settings Modal Open/Close
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal');
    
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('active');
        });
    }
    
    if (closeModalBtn && settingsModal) {
        closeModalBtn.addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });
        
        // Close modal when clicking background overlay
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('active');
            }
        });
    }
}

// Utilities
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeJsString(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

function formatTime(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
}
