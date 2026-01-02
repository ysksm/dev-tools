use super::{Email, UserId};

/// Represents a user in the system
#[derive(Debug, Clone)]
pub struct User {
    pub id: UserId,
    pub name: String,
    pub email: Email,
    pub role: UserRole,
}

/// User roles in the system
#[derive(Debug, Clone, PartialEq)]
pub enum UserRole {
    Admin,
    Member,
    Guest,
}

/// Represents a task
#[derive(Debug, Clone)]
pub struct Task {
    pub id: TaskId,
    pub title: String,
    pub description: Option<String>,
    pub status: TaskStatus,
    pub assignee: Option<UserId>,
}

/// Task identifier
#[derive(Debug, Clone, PartialEq)]
pub struct TaskId(pub u64);

/// Task status
#[derive(Debug, Clone, PartialEq)]
pub enum TaskStatus {
    Todo,
    InProgress,
    Done,
    Cancelled,
}

impl User {
    pub fn new(id: UserId, name: String, email: Email) -> Self {
        Self {
            id,
            name,
            email,
            role: UserRole::Member,
        }
    }

    pub fn is_admin(&self) -> bool {
        self.role == UserRole::Admin
    }

    pub fn change_role(&mut self, role: UserRole) {
        self.role = role;
    }
}

impl Task {
    pub fn new(id: TaskId, title: String) -> Self {
        Self {
            id,
            title,
            description: None,
            status: TaskStatus::Todo,
            assignee: None,
        }
    }

    pub fn assign(&mut self, user: &User) {
        self.assignee = Some(user.id.clone());
    }

    pub fn complete(&mut self) {
        self.status = TaskStatus::Done;
    }
}
