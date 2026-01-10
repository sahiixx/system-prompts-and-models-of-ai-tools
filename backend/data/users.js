const bcrypt = require('bcryptjs');

const usersData = [
  {
    name: "Admin User",
    email: "admin@aitoolshub.com",
    password: "Admin@123", // Will be hashed during seeding
    role: "admin",
    isVerified: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
    preferences: {
      theme: "dark",
      emailNotifications: true,
      language: "en"
    }
  },
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    password: "User@123",
    role: "moderator",
    isVerified: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    preferences: {
      theme: "light",
      emailNotifications: true,
      language: "en"
    }
  },
  {
    name: "Michael Chen",
    email: "michael.chen@example.com",
    password: "User@123",
    role: "user",
    isVerified: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
    preferences: {
      theme: "dark",
      emailNotifications: false,
      language: "en"
    }
  },
  {
    name: "Emily Rodriguez",
    email: "emily.rodriguez@example.com",
    password: "User@123",
    role: "user",
    isVerified: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
    preferences: {
      theme: "auto",
      emailNotifications: true,
      language: "en"
    }
  },
  {
    name: "David Kim",
    email: "david.kim@example.com",
    password: "User@123",
    role: "user",
    isVerified: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    preferences: {
      theme: "dark",
      emailNotifications: true,
      language: "en"
    }
  },
  {
    name: "Jessica Brown",
    email: "jessica.brown@example.com",
    password: "User@123",
    role: "user",
    isVerified: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica",
    preferences: {
      theme: "light",
      emailNotifications: true,
      language: "en"
    }
  },
  {
    name: "Alex Turner",
    email: "alex.turner@example.com",
    password: "User@123",
    role: "user",
    isVerified: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    preferences: {
      theme: "dark",
      emailNotifications: false,
      language: "en"
    }
  },
  {
    name: "Sophia Martinez",
    email: "sophia.martinez@example.com",
    password: "User@123",
    role: "user",
    isVerified: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia",
    preferences: {
      theme: "light",
      emailNotifications: true,
      language: "es"
    }
  },
  {
    name: "James Wilson",
    email: "james.wilson@example.com",
    password: "User@123",
    role: "user",
    isVerified: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    preferences: {
      theme: "dark",
      emailNotifications: true,
      language: "en"
    }
  },
  {
    name: "Olivia Taylor",
    email: "olivia.taylor@example.com",
    password: "User@123",
    role: "user",
    isVerified: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia",
    preferences: {
      theme: "auto",
      emailNotifications: true,
      language: "en"
    }
  }
];

module.exports = usersData;
