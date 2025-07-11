import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Download, Copy, Trash2, Settings, Eye, Edit3, Plus, X } from 'lucide-react';
import { io } from 'socket.io-client';
import { 
  Button, 
  Input, 
  Select, 
  Radio, 
  Checkbox, 
  DatePicker, 
  Form, 
  Card, 
  Space, 
  Typography, 
  Divider, 
  Badge, 
  Tag, 
  Alert, 
  ConfigProvider 
} from 'antd';
import { 
  SendOutlined, 
  RobotOutlined, 
  UserOutlined, 
  DownloadOutlined, 
  DeleteOutlined, 
  SettingOutlined, 
  EyeOutlined, 
  EditOutlined, 
  PlusOutlined, 
  CloseOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Paragraph, Text } = Typography;

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
    <Card 
      size="small" 
      style={{ backgroundColor: '#fff', border: '1px solid #ff7a00' }}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Button 
            type="text" 
            size="small"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ color: '#ff7a00', fontWeight: 500 }}
          >
            {isExpanded ? '▼' : '▶'} Field #{index + 1}: {field.label || 'Untitled'}
          </Button>
          <Tag color="orange">
            {fieldTypes.find(t => t.value === field.type)?.label || field.type}
          </Tag>
          {field.required && (
            <Tag color="red">Required</Tag>
          )}
        </div>
        <Button
          type="text"
          danger
          size="small"
          icon={<CloseOutlined />}
          onClick={onDelete}
          title="Delete Field"
        />
      </div>

      {isExpanded && (
        <div className="space-y-4 mt-4 border-t border-orange-100 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Text strong style={{ color: '#ff7a00', display: 'block', marginBottom: '4px' }}>Field ID</Text>
              <Input
                value={field.id}
                onChange={(e) => updateFieldProperty('id', e.target.value)}
                style={{ borderColor: '#ff7a00' }}
                size="small"
              />
            </div>
            <div>
              <Text strong style={{ color: '#ff7a00', display: 'block', marginBottom: '4px' }}>Label</Text>
              <Input
                value={field.label}
                onChange={(e) => updateFieldProperty('label', e.target.value)}
                style={{ borderColor: '#ff7a00' }}
                size="small"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Text strong style={{ color: '#ff7a00', display: 'block', marginBottom: '4px' }}>Field Type</Text>
              <Select
                value={field.type}
                onChange={(value) => updateFieldProperty('type', value)}
                style={{ width: '100%', borderColor: '#ff7a00' }}
                size="small"
              >
                {fieldTypes.map(type => (
                  <Option key={type.value} value={type.value}>{type.label}</Option>
                ))}
              </Select>
            </div>
            <div>
              <Text strong style={{ color: '#ff7a00', display: 'block', marginBottom: '4px' }}>Placeholder</Text>
              <Input
                value={field.placeholder || ''}
                onChange={(e) => updateFieldProperty('placeholder', e.target.value)}
                style={{ borderColor: '#ff7a00' }}
                size="small"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Checkbox
              checked={field.required || false}
              onChange={(e) => updateFieldProperty('required', e.target.checked)}
              style={{ color: '#ff7a00' }}
            >
              <Text style={{ color: '#ff7a00', fontWeight: 500 }}>Required Field</Text>
            </Checkbox>
          </div>

          {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
            <div>
              <Text strong style={{ color: '#ff7a00', display: 'block', marginBottom: '4px' }}>
                Options (one per line)
              </Text>
              <TextArea
                value={(field.options || []).join('\n')}
                onChange={(e) => updateOptions(e.target.value)}
                rows={4}
                style={{ borderColor: '#ff7a00' }}
                placeholder="Option 1\nOption 2\nOption 3"
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
    </Card>
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
  const [socket, setSocket] = useState(null);
  const [clientId, setClientId] = useState(null);
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

  // WebSocket connection setup
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    const id = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    setSocket(newSocket);
    setClientId(id);

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      newSocket.emit('join-room', id);
    });

    newSocket.on('form-processed', (data) => {
      console.log('Received processed form:', data);
      setIsLoading(false);
      
      if (data.success) {
        setFormData(prevData => ({
          ...prevData,
          title: data.form.title || prevData.title,
          description: data.form.description || prevData.description,
          fields: data.form.fields || prevData.fields
        }));
        setFormValues({});
        
        const botResponse = {
          id: Date.now(),
          type: 'bot',
          content: `✅ Đã tạo form "${data.form.title}" với ${data.form.fields.length} trường thông tin qua WebSocket! 🔌`
        };
        setMessages(prev => [...prev, botResponse]);
      } else {
        const errorResponse = {
          id: Date.now(),
          type: 'bot',
          content: '❌ Có lỗi khi xử lý form qua WebSocket: ' + (data.message || data.error)
        };
        setMessages(prev => [...prev, errorResponse]);
        
        // Fallback to local processing
        const fallbackForm = createFallbackForm(data.prompt || 'form cơ bản');
        setFormData(prevData => ({
          ...prevData,
          title: fallbackForm.title || prevData.title,
          description: fallbackForm.description || prevData.description,
          fields: fallbackForm.fields || prevData.fields
        }));
        setFormValues({});
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Handle form generation WebSocket events
    newSocket.on('form-generation-started', (data) => {
      console.log('Form generation started:', data);
      setIsLoading(true);
      
      const startMessage = {
        id: Date.now(),
        type: 'bot',
        content: '🔄 ' + data.message
      };
      setMessages(prev => [...prev, startMessage]);
    });

    newSocket.on('form-generated', (data) => {
      console.log('Form generated via WebSocket:', data);
      setIsLoading(false);
      
      if (data.success && data.generatedForm) {
        // Validate generatedForm structure
        if (!data.generatedForm.fields || !Array.isArray(data.generatedForm.fields)) {
          console.error('Invalid form structure from WebSocket');
          return;
        }
        
        // Set the generated form data (merge with existing structure)
        const generatedForm = data.generatedForm;
        setFormData(prevData => ({
          ...prevData,
          title: generatedForm.title || prevData.title,
          description: generatedForm.description || prevData.description,
          fields: generatedForm.fields || prevData.fields
        }));
        setFormValues({});
        
        // Show success message with service info
        const serviceInfo = data.metadata?.service || 'AI';
        const successResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: `✅ Đã tạo thành công form "${generatedForm.title}" với ${generatedForm.fields?.length || 0} trường thông tin!

🤖 **Powered by:** ${serviceInfo} (WebSocket)
📝 **Mô tả:** ${generatedForm.description}
⚙️ **Tính năng:** Validation thông minh, responsive design

Bạn có thể chỉnh sửa form bằng cách click vào các trường hoặc hỏi tôi thêm về cách tối ưu hóa form!`,
          service: serviceInfo
        };
        setMessages(prev => [...prev, successResponse]);
      }
    });

    newSocket.on('form-generation-error', (data) => {
      console.error('Form generation error via WebSocket:', data);
      setIsLoading(false);
      
      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: '❌ Lỗi tạo form qua WebSocket: ' + (data.message || data.error)
      };
      setMessages(prev => [...prev, errorResponse]);
      
      // Fallback to local processing
      const fallbackForm = createFallbackForm('form cơ bản');
      setFormData(prevData => ({
        ...prevData,
        title: fallbackForm.title || prevData.title,
        description: fallbackForm.description || prevData.description,
        fields: fallbackForm.fields || prevData.fields
      }));
    });

    // Handle chat WebSocket events
    newSocket.on('chat-typing', (data) => {
      if (data.typing) {
        const typingMessage = {
          id: 'typing',
          type: 'bot',
          content: '⌨️ Đang nhập...'
        };
        setMessages(prev => [...prev.filter(msg => msg.id !== 'typing'), typingMessage]);
      } else {
        setMessages(prev => prev.filter(msg => msg.id !== 'typing'));
      }
    });

    newSocket.on('chat-response', (data) => {
      console.log('Chat response via WebSocket:', data);
      setIsLoading(false);
      
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));
      
      if (data.success) {
        const botResponse = {
          id: Date.now(),
          type: 'bot',
          content: data.response,
          service: data.service,
          formContext: data.formContext
        };
        setMessages(prev => [...prev, botResponse]);
        
        // Show form context info if available
        if (data.formContext && data.metadata?.formReadiness) {
          console.log('Form readiness:', data.metadata.formReadiness);
        }
      }
    });

    // Handle form actions from enhanced assistant
    newSocket.on('form-actions', (data) => {
      console.log('Form actions received:', data);
      
      if (data.actions && data.actions.length > 0) {
        data.actions.forEach(action => {
          handleFormAction(action);
        });
      }
    });

    // Handle form save confirmation
    newSocket.on('form-save-confirmation', (data) => {
      console.log('Form save confirmation:', data);
      
      if (data.requiresConfirmation) {
        const confirmSave = window.confirm(data.message + '\n\n' + 
          (data.warnings && data.warnings.length > 0 ? 
            'Cảnh báo: ' + data.warnings.join(', ') : ''));
        
        if (confirmSave) {
          newSocket.emit('form-save', {
            formData: formData,
            confirmSave: true
          });
        }
      } else {
        alert(data.message);
      }
    });

    // Handle form save ready
    newSocket.on('form-save-ready', async (data) => {
      console.log('Form save ready:', data);
      
      if (data.success) {
        // Call the existing save function
        await saveFormToDatabase();
      }
    });

    newSocket.on('chat-error', (data) => {
      console.error('Chat error via WebSocket:', data);
      setIsLoading(false);
      
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));
      
      const errorResponse = {
        id: Date.now(),
        type: 'bot',
        content: '❌ Lỗi chat qua WebSocket: ' + (data.message || data.error)
      };
      setMessages(prev => [...prev, errorResponse]);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const generateMockFormFromPrompt = (prompt) => {
    const lowerPrompt = prompt.toLowerCase();
    const fields = [];
    let title = 'Form thông tin';
    let description = 'Vui lòng điền thông tin bên dưới';
    let introduction = 'Đây là form thu thập thông tin được tạo tự động.';
    let triggerPhrases = ['thông tin', 'form'];

    // Analyze prompt for specific fields
    if (lowerPrompt.includes('đăng ký') || lowerPrompt.includes('registration')) {
      title = 'Form đăng ký';
      description = 'Form đăng ký thông tin';
      introduction = 'Vui lòng điền đầy đủ thông tin để hoàn tất quá trình đăng ký.';
      triggerPhrases = ['đăng ký', 'registration', 'sign up'];
    }

    if (lowerPrompt.includes('khóa học') || lowerPrompt.includes('course')) {
      title = 'Form đăng ký khóa học';
      description = 'Đăng ký tham gia khóa học';
      introduction = 'Đăng ký khóa học để nhận được thông tin chi tiết và được tư vấn.';
      triggerPhrases = ['khóa học', 'course', 'đào tạo'];
    }

    if (lowerPrompt.includes('liên hệ') || lowerPrompt.includes('contact')) {
      title = 'Form liên hệ';
      description = 'Gửi thông tin liên hệ';
      introduction = 'Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.';
      triggerPhrases = ['liên hệ', 'contact', 'hỗ trợ'];
    }

    // Add fields based on prompt content
    if (lowerPrompt.includes('tên') || lowerPrompt.includes('họ') || lowerPrompt.includes('name')) {
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

    if (lowerPrompt.includes('tuổi') || lowerPrompt.includes('age')) {
      fields.push({
        id: 'age',
        label: 'Tuổi',
        type: 'number',
        required: false,
        placeholder: 'Nhập tuổi...'
      });
    }

    if (lowerPrompt.includes('địa chỉ') || lowerPrompt.includes('address')) {
      fields.push({
        id: 'address',
        label: 'Địa chỉ',
        type: 'textarea',
        required: false,
        placeholder: 'Nhập địa chỉ...'
      });
    }

    if (lowerPrompt.includes('kinh nghiệm') || lowerPrompt.includes('experience')) {
      fields.push({
        id: 'experience',
        label: 'Mức độ kinh nghiệm',
        type: 'select',
        required: true,
        placeholder: 'Chọn mức độ kinh nghiệm',
        options: ['Mới bắt đầu', 'Trung bình', 'Có kinh nghiệm', 'Chuyên gia']
      });
    }

    if (lowerPrompt.includes('giới tính') || lowerPrompt.includes('gender')) {
      fields.push({
        id: 'gender',
        label: 'Giới tính',
        type: 'radio',
        required: false,
        options: ['Nam', 'Nữ', 'Khác']
      });
    }

    if (lowerPrompt.includes('sở thích') || lowerPrompt.includes('hobby') || lowerPrompt.includes('interest')) {
      fields.push({
        id: 'interests',
        label: 'Sở thích',
        type: 'checkbox',
        required: false,
        options: ['Đọc sách', 'Du lịch', 'Thể thao', 'Âm nhạc', 'Công nghệ']
      });
    }

    if (lowerPrompt.includes('ngày sinh') || lowerPrompt.includes('birthday') || lowerPrompt.includes('date')) {
      fields.push({
        id: 'birthday',
        label: 'Ngày sinh',
        type: 'date',
        required: false,
        placeholder: 'Chọn ngày sinh'
      });
    }

    if (lowerPrompt.includes('ghi chú') || lowerPrompt.includes('note') || lowerPrompt.includes('message')) {
      fields.push({
        id: 'note',
        label: 'Ghi chú',
        type: 'textarea',
        required: false,
        placeholder: 'Nhập ghi chú (tùy chọn)...'
      });
    }

    // Default fields if none detected
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

    const mockForm = {
      title: title,
      description: description,
      introduction: introduction,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      triggerPhrases: triggerPhrases,
      emailConfig: {
        enabled: true,
        recipientEmail: 'admin@company.com',
        subject: 'New form submission: ' + title,
        template: 'Có form submission mới từ ' + title
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

    return JSON.stringify(mockForm, null, 2);
  };

  const generateForm = async (prompt) => {
    try {
      // Mock AI response based on prompt analysis
      const mockAIResponse = generateMockFormFromPrompt(prompt);
      
      let cleanResponse = mockAIResponse.trim();
      
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

  const isFormRequest = (input) => {
    const lowerInput = input.toLowerCase();
    const formKeywords = [
      'tạo form', 'tạo biểu mẫu', 'form', 'biểu mẫu', 'survey', 'khảo sát',
      'đăng ký', 'registration', 'đơn', 'application', 'feedback', 'phản hồi',
      'thu thập thông tin', 'collect information', 'questionnaire'
    ];
    return formKeywords.some(keyword => lowerInput.includes(keyword));
  };

  const handleChatMessage = async (message) => {
    try {
      // Call chat API endpoint with CrewAI support
      const response = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          conversation_id: clientId,
          useCrewAI: true, // Enable CrewAI by default
          context: {
            userId: clientId,
            timestamp: new Date().toISOString(),
            language: 'Vietnamese'
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: result.response,
          service: result.service || 'unknown',
          metadata: result.metadata
        };
        setMessages(prev => [...prev, botResponse]);
        
        // Show service indicator if using Enhanced AI
        if (result.service === 'LangChain') {
          console.log('✨ Powered by Enhanced AI Agent System');
        }
      } else {
        throw new Error(result.error || 'Chat API call failed');
      }
    } catch (error) {
      console.error('Chat API error:', error);
      
      // Enhanced fallback response
      const fallbackResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: `Xin chào! Tôi là FormAgent AI 🤖 - Trợ lý thông minh powered by CrewAI

Tôi có thể giúp bạn:
📝 **Tạo form tự động:**
   • "Tạo form đăng ký sự kiện"
   • "Tạo khảo sát khách hàng"
   • "Tạo form phản hồi"

💬 **Trò chuyện tự nhiên:**
   • Tư vấn thiết kế form
   • Giải đáp thắc mắc
   • Hướng dẫn sử dụng

🎯 **Tối ưu hóa form:**
   • Phân tích hiệu quả
   • Đề xuất cải thiện
   • Validation thông minh

Bạn muốn bắt đầu từ đâu? Hãy thử hỏi tôi bất cứ điều gì! 😊

*💡 Tip: Nói "tạo form" để tạo form mới hoặc chỉ cần trò chuyện bình thường!*

*🔧 Powered by Enhanced AI Agent System*`,
        service: 'fallback'
      };
      setMessages(prev => [...prev, fallbackResponse]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    // Check if this is a form creation request
    if (isFormRequest(currentInput)) {
      // Use WebSocket for form generation instead of API call
      if (socket && socket.connected) {
        socket.emit('generate-form', {
          description: currentInput,
          requirements: {
            fieldCount: 5,
            includeValidation: true,
            formType: 'dynamic',
            targetAudience: 'general',
            language: 'Vietnamese'
          },
          autoSave: false,
          useCrewAI: true
        });
        
        // The response will be handled by WebSocket event listeners
        return;
      } else {
        // Fallback to API if WebSocket not connected
        try {
          const response = await fetch('http://localhost:5000/api/ai/generate-form', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              description: currentInput,
              requirements: {
                fieldCount: 5,
                includeValidation: true,
                formType: 'dynamic',
                targetAudience: 'general',
                language: 'Vietnamese'
              },
              autoSave: false,
              useCrewAI: true
            }),
          });

        const result = await response.json();
        console.log('Generate form API response:', result); // Debug log
        
        // Validate response structure
        if (!result || typeof result !== 'object') {
          throw new Error('Invalid response format');
        }
        
        if (result.success && result.generatedForm) {
          // Validate generatedForm structure
          if (!result.generatedForm.fields || !Array.isArray(result.generatedForm.fields)) {
            throw new Error('Invalid form structure: missing fields array');
          }
          setIsLoading(false); // Add this line
          
          // Set the generated form data (merge with existing structure)
          const generatedForm = result.generatedForm;
          setFormData(prevData => ({
            ...prevData,
            title: generatedForm.title || prevData.title,
            description: generatedForm.description || prevData.description,
            fields: generatedForm.fields || prevData.fields
          }));
          setFormValues({});
          
          // Show success message with service info
          const serviceInfo = result.metadata?.service || 'AI';
          const successResponse = {
            id: Date.now() + 1,
            type: 'bot',
            content: `✅ Đã tạo thành công form "${generatedForm.title}" với ${generatedForm.fields?.length || 0} trường thông tin!

🤖 **Powered by:** ${serviceInfo}
📝 **Mô tả:** ${generatedForm.description}
⚙️ **Tính năng:** Validation thông minh, responsive design

Bạn có thể chỉnh sửa form bằng cách click vào các trường hoặc hỏi tôi thêm về cách tối ưu hóa form!`,
            service: serviceInfo
          };
          setMessages(prev => [...prev, successResponse]);
        } else {
          throw new Error(result.error || 'Form generation failed');
        }
      } catch (error) {
        console.error('Form API call error:', error);
        setIsLoading(false);
        
        const errorResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: '❌ Không thể kết nối đến server. Tạo form với dữ liệu mẫu...'
        };
        setMessages(prev => [...prev, errorResponse]);
        
        // Fallback to local processing
        try {
          const generatedForm = await generateForm(currentInput);
          
          if (generatedForm && generatedForm.fields && generatedForm.fields.length > 0) {
            setFormData(prevData => ({
              ...prevData,
              title: generatedForm.title || prevData.title,
              description: generatedForm.description || prevData.description,
              fields: generatedForm.fields || prevData.fields
            }));
            setFormValues({});
            
            const botResponse = {
              id: Date.now() + 2,
              type: 'bot',
              content: '✅ Đã tạo form "' + generatedForm.title + '" với ' + generatedForm.fields.length + ' trường thông tin (local).'
            };
            setMessages(prev => [...prev, botResponse]);
          } else {
            const fallbackForm = createFallbackForm(currentInput);
            setFormData(prevData => ({
              ...prevData,
              title: fallbackForm.title || prevData.title,
              description: fallbackForm.description || prevData.description,
              fields: fallbackForm.fields || prevData.fields
            }));
            setFormValues({});
          }
        } catch (localError) {
          const fallbackForm = createFallbackForm(currentInput);
          setFormData(prevData => ({
            ...prevData,
            title: fallbackForm.title || prevData.title,
            description: fallbackForm.description || prevData.description,
            fields: fallbackForm.fields || prevData.fields
          }));
          setFormValues({});
        }
      }
        }
    } else {
      // Handle regular chat message via WebSocket with form context
      if (socket && socket.connected) {
        socket.emit('chat-message-with-context', {
          message: currentInput,
          conversation_id: clientId,
          context: { 
            language: 'Vietnamese',
            previewMode: previewMode
          },
          formData: formData,
          useCrewAI: true
        });
        
        // The response will be handled by WebSocket event listeners
        return;
      } else {
        // Fallback to API if WebSocket not connected
        await handleChatMessage(currentInput);
      }
    }
    
    setIsLoading(false);
  };

  const handleInputChange = (fieldId, value) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmitForm = async () => {
    try {
      const requiredFields = formData.fields.filter(field => field.required);
      const missingFields = requiredFields.filter(field => !formValues[field.id]?.trim());
      
      if (missingFields.length > 0) {
        alert('Vui lòng điền đầy đủ: ' + missingFields.map(f => f.label).join(', '));
        return;
      }

      setIsLoading(true);

      // First, save form if not already saved
      let formId = formData.savedFormId;
      if (!formId) {
        const saveResult = await saveFormToDatabase();
        if (saveResult && saveResult.form) {
          formId = saveResult.form.id;
        } else {
          throw new Error('Không thể lưu form trước khi submit');
        }
      }

      // Submit form data
      const submissionPayload = {
        data: formValues,
        metadata: {
          submittedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
          conversationId: clientId
        }
      };

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/forms-enhanced/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionPayload)
      });

      const result = await response.json();

      if (result.success) {
        const successMsg = `🎉 Thông tin đã được gửi thành công!

📋 Chi tiết submission:
• Submission ID: ${result.submissionId}
• Thời gian: ${new Date().toLocaleString('vi-VN')}
• Form: ${formData.title}

Cảm ơn bạn đã sử dụng FormAgent! 🙏`;

        alert(successMsg);
        
        // Clear form values after successful submission
        setFormValues({});
      } else {
        throw new Error(result.error || 'Không thể gửi form');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Không thể gửi form: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setFormValues({});
  };

  const saveFormToDatabase = async () => {
    try {
      setIsLoading(true);

      const formPayload = {
        title: formData.title,
        description: formData.description,
        fields: formData.fields.map(field => ({
          ...field,
          name: field.name || field.id // Ensure name field exists
        })),
        settings: {
          theme: 'default',
          submitMessage: 'Cảm ơn bạn đã gửi thông tin!',
          allowMultipleSubmissions: true
        },
        metadata: {
          aiGenerated: formData.generatedBy !== 'manual',
          createdVia: 'form_builder',
          version: '1.0'
        },
        conversationId: clientId,
        userId: 'anonymous' // Could be replaced with actual user ID
      };

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/forms-enhanced/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formPayload)
      });

      const result = await response.json();

      if (result.success) {
        // Show success message with form details
        const successMsg = `🎉 Form "${result.form.title}" đã được lưu thành công!
        
📋 Chi tiết:
• ID: ${result.form.id}
• Số trường: ${result.form.fieldsCount}
• Ngày tạo: ${new Date(result.form.createdAt).toLocaleString('vi-VN')}
• URL: ${window.location.origin}${result.form.url}

${result.warnings?.length > 0 ? '⚠️ Cảnh báo: ' + result.warnings.join(', ') : ''}`;

        alert(successMsg);
        
        // Store form ID for future reference
        setFormData(prev => ({
          ...prev,
          savedFormId: result.form.id,
          shareUrl: result.form.shareUrl
        }));
        
        return result;
      } else {
        throw new Error(result.error || 'Không thể lưu form');
      }
    } catch (error) {
      console.error('Error saving form:', error);
      alert(`Không thể lưu form: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
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

  // Handle form actions from AI assistant
  const handleFormAction = (action) => {
    console.log('Handling form action:', action);
    
    switch (action.type) {
      case 'updateField':
        const fieldIndex = formData.fields.findIndex(f => f.id === action.fieldId);
        if (fieldIndex !== -1) {
          const updatedField = {
            ...formData.fields[fieldIndex],
            [action.property]: action.value
          };
          updateField(fieldIndex, updatedField);
        }
        break;
        
      case 'deleteField':
        const deleteIndex = formData.fields.findIndex(f => f.id === action.fieldId);
        if (deleteIndex !== -1) {
          deleteField(deleteIndex);
        }
        break;
        
      case 'addField':
        const newField = {
          id: 'field_' + Date.now(),
          label: action.label,
          type: action.fieldType,
          required: action.required,
          placeholder: ''
        };
        setFormData({
          ...formData,
          fields: [...formData.fields, newField]
        });
        break;
        
      case 'updateSetting':
        setFormData({
          ...formData,
          [action.setting]: action.value
        });
        break;
        
      case 'saveForm':
        if (action.confirm) {
          saveFormToDatabase();
        }
        break;
        
      default:
        console.warn('Unknown form action:', action.type);
    }
  };

  const renderField = (field) => {
    const commonProps = {
      id: field.id,
      placeholder: field.placeholder,
      value: formValues[field.id] || '',
      onChange: (e) => handleInputChange(field.id, e.target.value),
      style: { borderColor: '#ff7a00' }
    };

    switch (field.type) {
      case 'textarea':
        return (
          <TextArea
            {...commonProps}
            rows={4}
          />
        );
      
      case 'select':
        return (
          <Select
            {...commonProps}
            style={{ width: '100%', borderColor: '#ff7a00' }}
            onChange={(value) => handleInputChange(field.id, value)}
            placeholder={field.placeholder || 'Chọn một tùy chọn'}
          >
            {(field.options || []).map((option, idx) => (
              <Option key={idx} value={option}>{option}</Option>
            ))}
          </Select>
        );
      
      case 'radio':
        return (
          <Radio.Group 
            value={formValues[field.id]}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            {(field.options || []).map((option, idx) => (
              <Radio key={idx} value={option} style={{ color: '#ff7a00' }}>
                {option}
              </Radio>
            ))}
          </Radio.Group>
        );
      
      case 'checkbox':
        return (
          <Checkbox.Group 
            value={formValues[field.id] || []}
            onChange={(values) => handleInputChange(field.id, values)}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            {(field.options || []).map((option, idx) => (
              <Checkbox key={idx} value={option} style={{ color: '#ff7a00' }}>
                {option}
              </Checkbox>
            ))}
          </Checkbox.Group>
        );
      
      case 'date':
        return (
          <DatePicker
            {...commonProps}
            style={{ width: '100%', borderColor: '#ff7a00' }}
            onChange={(date, dateString) => handleInputChange(field.id, dateString)}
          />
        );
      
      default:
        return (
          <Input
            {...commonProps}
            type={field.type}
          />
        );
    }
  };

  const orangeTheme = {
    token: {
      colorPrimary: '#ff7a00',
      colorPrimaryHover: '#ff9500',
      colorPrimaryActive: '#e65f00',
      colorBgContainer: '#ffffff',
      colorBgElevated: '#fff7f0',
      borderRadius: 8,
    },
  };

  return (
    <ConfigProvider theme={orangeTheme}>
      <div className="h-screen flex" style={{ backgroundColor: '#fff7f0' }}>
        <div className="w-1/2 flex flex-col bg-white" style={{ borderRight: '1px solid #ff7a00' }}>
          <div className="p-4" style={{ borderBottom: '1px solid #ff7a00', background: 'linear-gradient(90deg, #ff7a00 0%, #ff9500 100%)', color: 'white' }}>
            <Title level={3} style={{ color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RobotOutlined style={{ fontSize: '24px' }} />
              FormAgent - AI Form Builder
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Mô tả form bạn muốn tạo</Text>
          </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={'flex items-start gap-3 ' + (message.type === 'user' ? 'flex-row-reverse' : '')}
            >
              <div 
                style={{ 
                  padding: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: message.type === 'user' ? '#ff7a00' : '#666',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {message.type === 'user' ? (
                  <UserOutlined style={{ fontSize: '16px' }} />
                ) : (
                  <RobotOutlined style={{ fontSize: '16px' }} />
                )}
              </div>
              <Card 
                size="small" 
                className={'max-w-xs lg:max-w-md'}
                style={{ 
                  backgroundColor: message.type === 'user' ? '#ff7a00' : '#f5f5f5',
                  color: message.type === 'user' ? 'white' : '#333',
                  border: message.type === 'user' ? '1px solid #ff7a00' : '1px solid #ddd'
                }}
              >
                {message.content}
              </Card>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-3">
              <div style={{ 
                padding: '8px', 
                borderRadius: '50%', 
                backgroundColor: '#666',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <RobotOutlined style={{ fontSize: '16px' }} />
              </div>
              <Card 
                size="small" 
                style={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}
              >
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#ff7a00' }}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce delay-100" style={{ backgroundColor: '#ff7a00' }}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce delay-200" style={{ backgroundColor: '#ff7a00' }}></div>
                </div>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4" style={{ borderTop: '1px solid #ff7a00' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={() => !isLoading && handleSendMessage()}
              placeholder="Mô tả form bạn muốn tạo..."
              disabled={isLoading}
              style={{ borderColor: '#ff7a00' }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              style={{ backgroundColor: '#ff7a00', borderColor: '#ff7a00' }}
            />
          </Space.Compact>
          <Text style={{ fontSize: '12px', color: '#666', marginTop: '8px', display: 'block' }}>
            Ví dụ: "Tạo form đăng ký khóa học với họ tên, email, số điện thoại"
          </Text>
        </div>
      </div>

      <div className="w-1/2 flex flex-col" style={{ backgroundColor: '#fff7f0' }}>
        <div className="p-4 bg-white flex justify-between items-center" style={{ borderBottom: '1px solid #ff7a00' }}>
          <div>
            <Title level={4} style={{ color: '#ff7a00', margin: 0 }}>
              {previewMode === 'preview' ? 'Preview Form' : 'Edit Form'}
            </Title>
            <Text style={{ color: '#666', fontSize: '14px' }}>
              {previewMode === 'preview' ? 'Xem trước form được tạo' : 'Chỉnh sửa chi tiết form'}
            </Text>
          </div>
          <Space>
            <Button
              type={previewMode === 'preview' ? 'default' : 'primary'}
              icon={previewMode === 'preview' ? <EditOutlined /> : <EyeOutlined />}
              onClick={() => setPreviewMode(previewMode === 'preview' ? 'edit' : 'preview')}
              style={{ 
                backgroundColor: previewMode === 'preview' ? '#fff7f0' : '#ff7a00',
                borderColor: '#ff7a00',
                color: previewMode === 'preview' ? '#ff7a00' : 'white'
              }}
            />
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={clearForm}
              title="Xóa dữ liệu form"
            />
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={saveFormToDatabase}
              disabled={isLoading}
              style={{ 
                backgroundColor: '#28a745',
                borderColor: '#28a745'
              }}
              title="Save to Database"
            >
              Save to Database
            </Button>
          </Space>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {previewMode === 'preview' ? (
            <div className="max-w-lg mx-auto">
              <Card style={{ backgroundColor: 'white', border: '1px solid #ff7a00' }}>
                {formData.introduction && (
                  <Alert
                    message="Giới thiệu"
                    description={
                      <>
                        <Paragraph style={{ color: '#ff7a00', margin: 0 }}>{formData.introduction}</Paragraph>
                        {(formData.startDate || formData.endDate) && (
                          <Text style={{ fontSize: '12px', color: '#ff7a00' }}>
                            {formData.startDate && 'Bắt đầu: ' + formData.startDate}
                            {formData.startDate && formData.endDate && ' • '}
                            {formData.endDate && 'Kết thúc: ' + formData.endDate}
                          </Text>
                        )}
                      </>
                    }
                    type="info"
                    style={{ 
                      backgroundColor: '#fff7f0', 
                      border: '1px solid #ff7a00',
                      marginBottom: '24px'
                    }}
                  />
                )}

                <div className="mb-6">
                  <Title level={2} style={{ color: '#ff7a00', marginBottom: '8px' }}>{formData.title}</Title>
                  <Paragraph style={{ color: '#666' }}>{formData.description}</Paragraph>
                </div>

                <Form layout="vertical">
                  {formData.fields.map((field, index) => (
                    <Form.Item
                      key={field.id || field.name || `field-${index}`}
                      label={
                        <Text strong style={{ color: '#ff7a00' }}>
                          {field.label}
                          {field.required && <Text style={{ color: 'red' }}> *</Text>}
                        </Text>
                      }
                      required={field.required}
                      style={{ marginBottom: '16px' }}
                    >
                      {renderField(field)}
                    </Form.Item>
                  ))}

                  <Form.Item style={{ marginTop: '16px' }}>
                    <Button
                      type="primary"
                      size="large"
                      block
                      onClick={handleSubmitForm}
                      style={{ backgroundColor: '#ff7a00', borderColor: '#ff7a00', height: '48px' }}
                    >
                      Gửi thông tin
                    </Button>

                    <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
                      {formData.emailConfig.enabled && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <Badge color="green" />
                          <Text style={{ fontSize: '12px' }}>Email notification được kích hoạt</Text>
                        </div>
                      )}
                      {formData.apiConfig.enabled && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <Badge color="blue" />
                          <Text style={{ fontSize: '12px' }}>API integration được kích hoạt</Text>
                        </div>
                      )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Badge color="orange" />
                          <Text style={{ fontSize: '12px' }}>Trigger: {formData.triggerPhrases.slice(0, 2).join(', ')}{formData.triggerPhrases.length > 2 ? '...' : ''}</Text>
                        </div>
                    </div>
                  </Form.Item>
                </Form>

                {Object.keys(formValues).length > 0 && (
                  <Card 
                    size="small" 
                    title={<Text strong style={{ color: '#ff7a00' }}>Dữ liệu hiện tại</Text>}
                    style={{ marginTop: '24px', backgroundColor: '#fff7f0', border: '1px solid #ff7a00' }}
                  >
                    <pre style={{ fontSize: '12px', color: '#666', overflowX: 'auto', margin: 0 }}>
                      {JSON.stringify(formValues, null, 2)}
                    </pre>
                  </Card>
                )}
              </Card>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <Card style={{ backgroundColor: 'white', border: '1px solid #ff7a00' }}>
                {!isFormValid() && (
                  <Alert
                    message="⚠️ Form chưa đầy đủ để xuất"
                    description="Cần có: lời giới thiệu, ngày bắt đầu/kết thúc, trigger phrases, và ít nhất 1 field"
                    type="warning"
                    style={{ marginBottom: '24px' }}
                    showIcon
                  />
                )}

                <Card 
                  title={<Text strong style={{ color: '#ff7a00' }}>Form Settings</Text>}
                  style={{ marginBottom: '24px', backgroundColor: '#fff7f0', border: '1px solid #ff7a00' }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Text strong style={{ color: '#ff7a00', display: 'block', marginBottom: '4px' }}>Form Title</Text>
                      <Input
                        value={formData.title}
                        onChange={(e) => updateFormData({ ...formData, title: e.target.value })}
                        style={{ borderColor: '#ff7a00' }}
                      />
                    </div>
                    <div>
                      <Text strong style={{ color: '#ff7a00', display: 'block', marginBottom: '4px' }}>Form Description</Text>
                      <Input
                        value={formData.description}
                        onChange={(e) => updateFormData({ ...formData, description: e.target.value })}
                        style={{ borderColor: '#ff7a00' }}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Text strong style={{ color: '#ff7a00', display: 'block', marginBottom: '4px' }}>
                        Introduction <Text style={{ color: 'red' }}>*</Text>
                      </Text>
                      <TextArea
                        value={formData.introduction}
                        onChange={(e) => updateFormData({ ...formData, introduction: e.target.value })}
                        rows={3}
                        style={{ borderColor: '#ff7a00' }}
                        placeholder="Lời giới thiệu chi tiết về form này..."
                      />
                    </div>
                    <div>
                      <Text strong style={{ color: '#ff7a00', display: 'block', marginBottom: '4px' }}>
                        Start Date <Text style={{ color: 'red' }}>*</Text>
                      </Text>
                      <DatePicker
                        value={formData.startDate ? dayjs(formData.startDate) : null}
                        onChange={(date, dateString) => updateFormData({ ...formData, startDate: dateString })}
                        style={{ width: '100%', borderColor: '#ff7a00' }}
                      />
                    </div>
                    <div>
                      <Text strong style={{ color: '#ff7a00', display: 'block', marginBottom: '4px' }}>
                        End Date <Text style={{ color: 'red' }}>*</Text>
                      </Text>
                      <DatePicker
                        value={formData.endDate ? dayjs(formData.endDate) : null}
                        onChange={(date, dateString) => updateFormData({ ...formData, endDate: dateString })}
                        style={{ width: '100%', borderColor: '#ff7a00' }}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Text strong style={{ color: '#ff7a00', display: 'block', marginBottom: '4px' }}>
                        Trigger Phrases <Text style={{ color: 'red' }}>*</Text>
                      </Text>
                      <Input
                        value={formData.triggerPhrases.join(', ')}
                        onChange={(e) => updateFormData({ 
                          ...formData, 
                          triggerPhrases: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                        })}
                        style={{ borderColor: '#ff7a00' }}
                        placeholder="từ khóa 1, từ khóa 2, từ khóa 3..."
                      />
                      <Text style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>Các từ khóa liên quan đến chủ đề form</Text>
                    </div>
                  </div>
                </Card>

                <Card
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ color: '#ff7a00' }}>Form Fields</Text>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={addNewField}
                        style={{ backgroundColor: '#ff7a00', borderColor: '#ff7a00' }}
                      >
                        Add Field
                      </Button>
                    </div>
                  }
                  style={{ marginBottom: '24px', backgroundColor: '#fff7f0', border: '1px solid #ff7a00' }}
                >

                  <div className="space-y-4">
                    {formData.fields.map((field, index) => (
                      <FieldEditor
                        key={field.id || field.name || `field-${index}`}
                        field={field}
                        index={index}
                        onUpdate={(updatedField) => updateField(index, updatedField)}
                        onDelete={() => deleteField(index)}
                      />
                    ))}
                  </div>
                </Card>

                <Card 
                  title={<Text strong style={{ color: '#ff7a00' }}>Form JSON Structure</Text>}
                  style={{ backgroundColor: '#fff7f0', border: '1px solid #ff7a00' }}
                >
                  <pre style={{ fontSize: '12px', color: '#666', overflowX: 'auto', backgroundColor: 'white', padding: '12px', borderRadius: '4px', border: '1px solid #ddd', maxHeight: '160px', margin: 0 }}>
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                </Card>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
    </ConfigProvider>
  );
};

export default FormAgent;