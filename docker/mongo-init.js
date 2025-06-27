// MongoDB initialization script
db = db.getSiblingDB('formagent');

// Create collections
db.createCollection('forms');
db.createCollection('submissions');
db.createCollection('users');

// Create indexes
db.forms.createIndex({ "createdAt": -1 });
db.forms.createIndex({ "title": "text", "description": "text" });
db.submissions.createIndex({ "formId": 1, "createdAt": -1 });
db.users.createIndex({ "email": 1 }, { unique: true });

// Insert sample data
db.forms.insertMany([
    {
        title: "Contact Form",
        description: "Basic contact form template",
        fields: [
            { type: "text", name: "name", label: "Full Name", required: true },
            { type: "email", name: "email", label: "Email", required: true },
            { type: "textarea", name: "message", label: "Message", required: true }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
    },
    {
        title: "Survey Form",
        description: "Customer satisfaction survey",
        fields: [
            { type: "text", name: "name", label: "Name", required: true },
            { type: "select", name: "rating", label: "Rating", options: ["1", "2", "3", "4", "5"], required: true },
            { type: "textarea", name: "feedback", label: "Feedback", required: false }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
    }
]);

print('Database initialized successfully');
print('Collections created: forms, submissions, users');
print('Sample data inserted');