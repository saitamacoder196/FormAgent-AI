import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Download, Copy, Trash2, Settings, Eye, Edit3, Plus, X } from 'lucide-react';

const FieldEditor = ({ field, index, onUpdate, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const fieldTypes = [
    { value: 'text', label: 'Text (string)' },
    { value: 'email', label: 'Email (string)' },
    { value: 'number', label: 'Number (number)' },
    { value: 'tel', label: 'Phone (string)' },
    { value: 'date', label: 'Date (date)' },
    { value: 'textarea', label: 'Textarea (string)' },
    { value: 'select', label: 'Select (options)' },
    { value: 'radio', label: 'Radio (options)' },
    { value: 'checkbox', label: 'Checkbox (boolean/options)' }
  ];

  const updateFieldProperty = (property, value) => {
    onUpdate({
      ...field,
      [property]: value
    });
  };

  const updateOptions = (optionsString) => {
    const options = optionsString.split('\n').filter(opt => opt.trim());
    updateFieldProperty('options', options);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-gray-800 hover:text-blue-600"
          >
            {isExpanded ? '▼' : '▶'} Field #{index + 1}: {field.label || 'Untitled'}
          </button>
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
            {fieldTypes.find(t => t.value === field.type)?.label || field.type}
          </span>
          {field.required && (
            <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">Required</span>
          )}
        </div>
        <button
          onClick={onDelete}
          className="p-1 text-red-600 hover:bg-red-50 rounded"
          title="Delete Field"
        >
          <X size={16} />
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4 mt-4 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field ID</label>
              <input
                type="text"
                value={field.id}
                onChange={(e) => updateFieldProperty('id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => updateFieldProperty('label', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
              <select
                value={field.type}
                onChange={(e) => updateFieldProperty('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {fieldTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => updateFieldProperty('placeholder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={field.required || false}
                onChange={(e) => updateFieldProperty('required', e.target.checked)}
                className="text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Required Field</span>
            </label>
          </div>

          {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Options (one per line)
              </label>
              <textarea
                value={(field.options || []).join('\n')}
                onChange={(e) => updateOptions(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Option 1&#10;Option 2&#10;Option 3"
              />
            </div>
          )}

          <div className="p-3 bg-gray-50 rounded-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preview:
            </label>
            <div className="text-sm text-gray-600">
              <strong>Type:</strong> {field.type} | 
              <strong> Required:</strong> {field.required ? 'Yes' : 'No'} |
                      <strong> Data Type:</strong> {(() => {
                        if (field.type === 'number') return 'number';
                        if (field.type === 'date') return 'date';
                        if (field.type === 'checkbox' && field.options) return 'array';
                        if (field.type === 'checkbox') return 'boolean';
                        if (field.type === 'select' || field.type === 'radio') return 'string (from options)';
                        return 'string';
                      })()}
            {field.options && field.options.length > 0 && (
              <div>
                <br/><strong>Options:</strong> {field.options.join(', ')}
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FormAgent = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Xin chào! Tôi là FormAgent AI. Hãy mô tả form bạn muốn tạo, ví dụ: "Tạo form đăng ký khóa học gồm họ tên, email, số điện thoại và mức độ kinh nghiệm"'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: 'Form mẫu',
    description: 'Điền thông tin bên dưới',
    introduction: '',
    startDate: '',
    endDate: '',
    triggerPhrases: [],
    emailConfig: {
      enabled: false,
      recipientEmail: '',
      subject: '',
      template: ''
    },
    apiConfig: {
      enabled: false,
      endpoint: '',
      method: 'POST',
      headers: {},
      customHeaders: ''
    },
    fields: [
      {
        id: 'name',
        label: 'Họ và tên',
        type: 'text',
        required: true,
        placeholder: 'Nhập họ tên của bạn'
      },
      {
        id: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        placeholder: 'example@email.com'
      }
    ]
  });
  const [formValues, setFormValues] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [previewMode, setPreviewMode] = useState('preview');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateForm = async (prompt) => {
    try {
      const formPrompt = 'Tạo form dựa trên yêu cầu: "' + prompt + '"\n\nTrả lời CHÍNH XÁC theo format JSON này:\n{\n  "title": "Tên form phù hợp",\n  "description": "Mô tả ngắn gọn về form",\n  "introduction": "Lời giới thiệu chi tiết về form này",\n  "startDate": "2024-01-01",\n  "endDate": "2024-12-31",\n  "triggerPhrases": ["từ khóa 1", "từ khóa 2"],\n  "emailConfig": {\n    "enabled": true,\n    "recipientEmail": "admin@company.com",\n    "subject": "New form submission",\n    "template": "New submission received"\n  },\n  "apiConfig": {\n    "enabled": true,\n    "endpoint": "https://api.company.com/submit",\n    "method": "POST"\n  },\n  "fields": [\n    {\n      "id": "field_id",\n      "label": "Tên trường",\n      "type": "text",\n      "required": true,\n      "placeholder": "Nhập thông tin..."\n    }\n  ]\n}\n\nCHỈ TRẢ VỀ JSON, KHÔNG CÓ TEXT KHÁC.';

      const response = await window.claude.complete(formPrompt);
      
      let cleanResponse = response.trim();
      
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      const parsed = JSON.parse(cleanResponse);
      
      if (!parsed.title || !parsed.fields || !Array.isArray(parsed.fields)) {
        throw new Error('Invalid form structure');
      }
      
      parsed.fields = parsed.fields.map(field => ({
        id: field.id || 'field_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        label: field.label || 'Untitled Field',
        type: field.type || 'text',
        required: field.required !== undefined ? field.required : true,
        placeholder: field.placeholder || 'Nhập ' + (field.label || 'thông tin') + '...',
        ...(field.options && { options: field.options })
      }));

      const completeForm = {
        title: parsed.title,
        description: parsed.description || 'Vui lòng điền thông tin bên dưới',
        introduction: parsed.introduction || '',
        startDate: parsed.startDate || '',
        endDate: parsed.endDate || '',
        triggerPhrases: parsed.triggerPhrases || [],
        emailConfig: {
          enabled: parsed.emailConfig?.enabled || false,
          recipientEmail: parsed.emailConfig?.recipientEmail || '',
          subject: parsed.emailConfig?.subject || '',
          template: parsed.emailConfig?.template || ''
        },
        apiConfig: {
          enabled: parsed.apiConfig?.enabled || false,
          endpoint: parsed.apiConfig?.endpoint || '',
          method: parsed.apiConfig?.method || 'POST',
          headers: parsed.apiConfig?.headers || {},
          customHeaders: ''
        },
        fields: parsed.fields
      };
      
      return completeForm;
    } catch (error) {
      console.error('Error generating form:', error);
      return createFallbackForm(prompt);
    }
  };

  const createFallbackForm = (prompt) => {
    const fields = [];
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('tên') || lowerPrompt.includes('họ')) {
      fields.push({
        id: 'name',
        label: 'Họ và tên',
        type: 'text',
        required: true,
        placeholder: 'Nhập họ và tên...'
      });
    }
    
    if (lowerPrompt.includes('email')) {
      fields.push({
        id: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        placeholder: 'example@email.com'
      });
    }
    
    if (lowerPrompt.includes('điện thoại') || lowerPrompt.includes('sdt') || lowerPrompt.includes('phone')) {
      fields.push({
        id: 'phone',
        label: 'Số điện thoại',
        type: 'tel',
        required: true,
        placeholder: '0123456789'
      });
    }
    
    if (fields.length === 0) {
      fields.push(
        {
          id: 'name',
          label: 'Họ và tên',
          type: 'text',
          required: true,
          placeholder: 'Nhập họ và tên...'
        },
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          required: true,
          placeholder: 'example@email.com'
        }
      );
    }
    
    return {
      title: 'Form thông tin',
      description: 'Vui lòng điền thông tin bên dưới',
      introduction: 'Đây là form thu thập thông tin cơ bản.',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      triggerPhrases: ['thông tin', 'form', 'đăng ký'],
      emailConfig: {
        enabled: false,
        recipientEmail: '',
        subject: 'Form submission',
        template: 'New form submission'
      },
      apiConfig: {
        enabled: false,
        endpoint: '',
        method: 'POST',
        headers: {},
        customHeaders: ''
      },
      fields: fields
    };
  };

  const isFormValid = () => {
    return (
      formData.introduction.trim() !== '' &&
      formData.startDate !== '' &&
      formData.endDate !== '' &&
      formData.triggerPhrases.length > 0 &&
      formData.fields.length > 0
    );
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const generatedForm = await generateForm(inputValue);
      
      if (generatedForm && generatedForm.fields && generatedForm.fields.length > 0) {
        setFormData(generatedForm);
        setFormValues({});
        
        const isComplete = isFormValid();
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: '✅ Đã tạo form "' + generatedForm.title + '" với ' + generatedForm.fields.length + ' trường thông tin. ' + (isComplete ? 'Form đã đầy đủ thông tin!' : '⚠️ Form cần bổ sung thêm thông tin.')
        };
        setMessages(prev => [...prev, botResponse]);
      } else {
        throw new Error('Invalid form generated');
      }
    } catch (error) {
      console.error('Form generation error:', error);
      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: '❌ Có lỗi khi tạo form từ AI. Tôi đã tạo form cơ bản cho bạn.'
      };
      setMessages(prev => [...prev, errorResponse]);
      
      const fallbackForm = createFallbackForm(inputValue);
      setFormData(fallbackForm);
      setFormValues({});
    }

    setIsLoading(false);
  };

  const handleInputChange = (fieldId, value) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmitForm = () => {
    const requiredFields = formData.fields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !formValues[field.id]?.trim());
    
    if (missingFields.length > 0) {
      alert('Vui lòng điền đầy đủ: ' + missingFields.map(f => f.label).join(', '));
      return;
    }

    alert('Form đã được submit thành công!\n\nDữ liệu:\n' + JSON.stringify(formValues, null, 2));
  };

  const clearForm = () => {
    setFormValues({});
  };

  const exportForm = () => {
    const formConfig = {
      ...formData,
      values: formValues
    };
    
    const blob = new Blob([JSON.stringify(formConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = formData.title.replace(/\s+/g, '_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateFormData = (newFormData) => {
    setFormData(newFormData);
  };

  const updateField = (fieldIndex, updatedField) => {
    const newFields = [...formData.fields];
    newFields[fieldIndex] = updatedField;
    setFormData({
      ...formData,
      fields: newFields
    });
  };

  const deleteField = (fieldIndex) => {
    const newFields = formData.fields.filter((_, index) => index !== fieldIndex);
    setFormData({
      ...formData,
      fields: newFields
    });
  };

  const addNewField = () => {
    const newField = {
      id: 'field_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      label: 'New Field',
      type: 'text',
      required: false,
      placeholder: 'Enter value...'
    };
    setFormData({
      ...formData,
      fields: [...formData.fields, newField]
    });
  };

  const renderField = (field) => {
    const commonProps = {
      id: field.id,
      required: field.required,
      className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
      value: formValues[field.id] || '',
      onChange: (e) => handleInputChange(field.id, e.target.value)
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            placeholder={field.placeholder}
            rows={4}
          />
        );
      
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">{field.placeholder || 'Chọn một tùy chọn'}</option>
            {(field.options || []).map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            {(field.options || []).map((option, idx) => (
              <label key={idx} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={formValues[field.id] === option}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="text-blue-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            {(field.options || []).map((option, idx) => (
              <label key={idx} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={option}
                  checked={(formValues[field.id] || []).includes(option)}
                  onChange={(e) => {
                    const currentValues = formValues[field.id] || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter(v => v !== option);
                    handleInputChange(field.id, newValues);
                  }}
                  className="text-blue-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      
      default:
        return (
          <input
            {...commonProps}
            type={field.type}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <div className="h-screen flex bg-gray-100">
      <div className="w-1/2 flex flex-col bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bot size={24} />
            FormAgent - AI Form Builder
          </h1>
          <p className="text-blue-100 text-sm mt-1">Mô tả form bạn muốn tạo</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={'flex items-start gap-3 ' + (message.type === 'user' ? 'flex-row-reverse' : '')}
            >
              <div className={'p-2 rounded-full ' + (message.type === 'user' ? 'bg-blue-500' : 'bg-gray-500')}>
                {message.type === 'user' ? (
                  <User size={16} className="text-white" />
                ) : (
                  <Bot size={16} className="text-white" />
                )}
              </div>
              <div
                className={'max-w-xs lg:max-w-md px-4 py-2 rounded-lg ' + (message.type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800')}
              >
                {message.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-gray-500">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
              placeholder="Mô tả form bạn muốn tạo..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Ví dụ: "Tạo form đăng ký khóa học với họ tên, email, số điện thoại"
          </div>
        </div>
      </div>

      <div className="w-1/2 flex flex-col bg-gray-50">
        <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {previewMode === 'preview' ? 'Preview Form' : 'Edit Form'}
            </h2>
            <p className="text-sm text-gray-600">
              {previewMode === 'preview' ? 'Xem trước form được tạo' : 'Chỉnh sửa chi tiết form'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPreviewMode(previewMode === 'preview' ? 'edit' : 'preview')}
              className={'p-2 rounded-md ' + (previewMode === 'preview' ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-green-600 bg-green-50 hover:bg-green-100')}
              title={previewMode === 'preview' ? 'Chuyển sang Edit Mode' : 'Chuyển sang Preview Mode'}
            >
              {previewMode === 'preview' ? <Edit3 size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={clearForm}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md"
              title="Xóa dữ liệu form"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={exportForm}
              disabled={!isFormValid()}
              className={'p-2 rounded-md ' + (isFormValid() ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-gray-400 cursor-not-allowed')}
              title={isFormValid() ? "Xuất form" : "Form chưa đủ thông tin để xuất"}
            >
              <Download size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {previewMode === 'preview' ? (
            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-lg shadow-md p-6">
                {formData.introduction && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-medium text-blue-800 mb-2">Giới thiệu</h4>
                    <p className="text-blue-700 text-sm">{formData.introduction}</p>
                    {(formData.startDate || formData.endDate) && (
                      <div className="mt-3 text-xs text-blue-600">
                        {formData.startDate && 'Bắt đầu: ' + formData.startDate}
                        {formData.startDate && formData.endDate && ' • '}
                        {formData.endDate && 'Kết thúc: ' + formData.endDate}
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{formData.title}</h3>
                  <p className="text-gray-600">{formData.description}</p>
                </div>

                <div className="space-y-4">
                  {formData.fields.map((field) => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderField(field)}
                    </div>
                  ))}

                  <div className="pt-4">
                    <button
                      onClick={handleSubmitForm}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Gửi thông tin
                    </button>

                    <div className="mt-4 text-xs text-gray-500 space-y-1">
                      {formData.emailConfig.enabled && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Email notification được kích hoạt
                        </div>
                      )}
                      {formData.apiConfig.enabled && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          API integration được kích hoạt
                        </div>
                      )}
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          <span>Trigger: {formData.triggerPhrases.slice(0, 2).join(', ')}{formData.triggerPhrases.length > 2 ? '...' : ''}</span>
                        </div>
                    </div>
                  </div>
                </div>

                {Object.keys(formValues).length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-md">
                    <h4 className="font-medium text-gray-800 mb-2">Dữ liệu hiện tại:</h4>
                    <pre className="text-xs text-gray-600 overflow-x-auto">
                      {JSON.stringify(formValues, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-md p-6">
                {!isFormValid() && (
                  <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
                    <h4 className="font-medium text-yellow-800 mb-2">⚠️ Form chưa đầy đủ để xuất</h4>
                    <p className="text-yellow-700 text-sm">
                      Cần có: lời giới thiệu, ngày bắt đầu/kết thúc, trigger phrases, và ít nhất 1 field
                    </p>
                  </div>
                )}

                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Form Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Form Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => updateFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Form Description</label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => updateFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Introduction <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.introduction}
                        onChange={(e) => updateFormData({ ...formData, introduction: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Lời giới thiệu chi tiết về form này..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => updateFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => updateFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trigger Phrases <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.triggerPhrases.join(', ')}
                        onChange={(e) => updateFormData({ 
                          ...formData, 
                          triggerPhrases: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="từ khóa 1, từ khóa 2, từ khóa 3..."
                      />
                      <p className="text-xs text-gray-500 mt-1">Các từ khóa liên quan đến chủ đề form</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Form Fields</h3>
                    <button
                      onClick={addNewField}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Plus size={16} />
                      Add Field
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.fields.map((field, index) => (
                      <FieldEditor
                        key={field.id}
                        field={field}
                        index={index}
                        onUpdate={(updatedField) => updateField(index, updatedField)}
                        onDelete={() => deleteField(index)}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">Form JSON Structure:</h4>
                  <pre className="text-xs text-gray-600 overflow-x-auto bg-white p-3 rounded border max-h-40">
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormAgent;