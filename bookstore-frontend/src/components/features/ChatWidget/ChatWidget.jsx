import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Sparkles, RefreshCw } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { chatWithAI } from '../../../api/services/aiApi';
import Spinner from '../../common/Spinner';

/**
 * ChatWidget: Trợ lý AI tư vấn sách thông minh
 * Thiết kế chuẩn responsive cho desktop & mobile
 */
const QUICK_PROMPTS = [
  'Gợi ý sách phát triển bản thân hay nhất',
  'Có sách kinh tế nào mới không?',
  'Top tiểu thuyết bán chạy tháng này',
];

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { showToast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    try {
      setIsLoading(true);
      const response = await chatWithAI({ message: text });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            response?.answer || response?.data?.message ||
            response?.message ||
            'Rất vui được hỗ trợ bạn tìm kiếm những cuốn sách giá trị!',
        },
      ]);
    } catch {
      showToast({ type: 'error', message: 'Lỗi kết nối tới trợ lý AI' });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Hiện tại hệ thống AI đang bận. Bạn hãy xem qua các danh mục sách trên website nhé!',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white p-3.5 sm:p-4 rounded-full shadow-xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all duration-200 z-30 flex items-center gap-2 group"
        title="Trợ lý AI tư vấn sách"
        aria-label="Mở trợ lý AI"
      >
        <Bot size={24} className="group-hover:rotate-12 transition-transform" />
        <span className="hidden sm:inline text-xs font-bold pr-1">Hỏi AI</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col h-[480px] max-h-[75vh] z-40 overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white p-3.5 sm:p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">AI Book Assistant</h3>
            <p className="text-[11px] text-white/80">Trợ lý gợi ý & tư vấn sách</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="Làm mới đoạn chat"
            >
              <RefreshCw size={16} />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
            aria-label="Đóng chat"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50 dark:bg-gray-950 text-xs sm:text-sm">
        {messages.length === 0 ? (
          <div className="text-center py-6 px-2 space-y-3">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
              <Bot size={26} />
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                Xin chào bạn! 👋
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Tôi là AI của Phương Anh Bookstore. Bạn đang tìm cuốn sách thuộc thể loại nào?
              </p>
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="pt-2 space-y-1.5 text-left">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Gợi ý nhanh cho bạn:
              </p>
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="w-full text-left text-xs bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-gray-700 dark:text-gray-200 p-2 rounded-xl border border-gray-200 dark:border-gray-700 transition line-clamp-1"
                >
                  💡 {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-gray-700'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-2xl rounded-bl-none flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Spinner size="sm" />
              <span className="text-xs">AI đang chuẩn bị câu trả lời...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-2.5 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi về sách, tác giả, giá..."
          disabled={isLoading}
          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-indigo-600/20"
          aria-label="Gửi tin nhắn"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default ChatWidget;
