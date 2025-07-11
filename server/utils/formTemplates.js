// Generate a default form template when AI services are unavailable
export function generateDefaultForm(description, requirements = {}) {
  const {
    fieldCount = 5,
    includeValidation = true,
    formType = 'contact',
    targetAudience = 'general',
    language = 'Vietnamese'
  } = requirements;

  // Basic form template based on description keywords
  const isRegistration = description.toLowerCase().includes('đăng ký') || description.toLowerCase().includes('registration');
  const isSurvey = description.toLowerCase().includes('khảo sát') || description.toLowerCase().includes('survey');
  const isContact = description.toLowerCase().includes('liên hệ') || description.toLowerCase().includes('contact');
  
  let formTitle = 'Form Đăng Ký';
  let formDescription = 'Vui lòng điền thông tin vào form dưới đây';
  let fields = [];

  if (isRegistration) {
    formTitle = 'Form Đăng Ký';
    formDescription = 'Vui lòng điền đầy đủ thông tin để hoàn tất đăng ký';
    fields = [
      { id: 'fullName', type: 'text', name: 'fullName', label: 'Họ và tên', required: true, placeholder: 'Nhập họ và tên đầy đủ' },
      { id: 'email', type: 'email', name: 'email', label: 'Email', required: true, placeholder: 'example@email.com' },
      { id: 'phone', type: 'tel', name: 'phone', label: 'Số điện thoại', required: true, placeholder: '0123456789' },
      { id: 'category', type: 'select', name: 'category', label: 'Loại đăng ký', required: true, options: ['Cá nhân', 'Doanh nghiệp', 'Tổ chức'] },
      { id: 'note', type: 'textarea', name: 'note', label: 'Ghi chú', required: false, placeholder: 'Ghi chú thêm (nếu có)' }
    ];
  } else if (isSurvey) {
    formTitle = 'Khảo Sát Ý Kiến';
    formDescription = 'Ý kiến của bạn rất quan trọng với chúng tôi';
    fields = [
      { id: 'name', type: 'text', name: 'name', label: 'Tên của bạn', required: false, placeholder: 'Tên (tùy chọn)' },
      { id: 'satisfaction', type: 'radio', name: 'satisfaction', label: 'Mức độ hài lòng', required: true, options: ['Rất hài lòng', 'Hài lòng', 'Bình thường', 'Không hài lòng'] },
      { id: 'features', type: 'checkbox', name: 'features', label: 'Tính năng quan tâm', required: false, options: ['Giao diện', 'Hiệu năng', 'Tính năng', 'Hỗ trợ'] },
      { id: 'feedback', type: 'textarea', name: 'feedback', label: 'Góp ý', required: true, placeholder: 'Chia sẻ ý kiến của bạn' },
      { id: 'rating', type: 'number', name: 'rating', label: 'Đánh giá (1-10)', required: true, placeholder: '10' }
    ];
  } else if (isContact) {
    formTitle = 'Liên Hệ';
    formDescription = 'Chúng tôi sẽ phản hồi trong thời gian sớm nhất';
    fields = [
      { id: 'name', type: 'text', name: 'name', label: 'Họ tên', required: true, placeholder: 'Nhập họ tên' },
      { id: 'email', type: 'email', name: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
      { id: 'subject', type: 'text', name: 'subject', label: 'Chủ đề', required: true, placeholder: 'Chủ đề liên hệ' },
      { id: 'message', type: 'textarea', name: 'message', label: 'Nội dung', required: true, placeholder: 'Nội dung tin nhắn' },
      { id: 'priority', type: 'select', name: 'priority', label: 'Mức độ ưu tiên', required: false, options: ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'] }
    ];
  } else {
    // Generic form
    fields = [
      { id: 'name', type: 'text', name: 'name', label: 'Tên', required: true, placeholder: 'Nhập tên' },
      { id: 'email', type: 'email', name: 'email', label: 'Email', required: true, placeholder: 'email@example.com' },
      { id: 'phone', type: 'tel', name: 'phone', label: 'Điện thoại', required: false, placeholder: 'Số điện thoại' },
      { id: 'message', type: 'textarea', name: 'message', label: 'Tin nhắn', required: true, placeholder: 'Nhập tin nhắn' },
      { id: 'date', type: 'date', name: 'date', label: 'Ngày', required: false }
    ];
  }

  // Adjust field count if specified
  if (fieldCount && fieldCount !== fields.length) {
    if (fieldCount < fields.length) {
      fields = fields.slice(0, fieldCount);
    } else {
      // Add more generic fields if needed
      while (fields.length < fieldCount) {
        fields.push({
          id: `field_${fields.length + 1}`,
          type: 'text',
          name: `field_${fields.length + 1}`,
          label: `Trường ${fields.length + 1}`,
          required: false,
          placeholder: `Nhập thông tin trường ${fields.length + 1}`
        });
      }
    }
  }

  return {
    title: formTitle,
    description: formDescription,
    fields: fields,
    generatedBy: 'template',
    language: language
  };
}