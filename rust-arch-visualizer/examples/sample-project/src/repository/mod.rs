use crate::domain::{Task, TaskId, User, UserId};

/// Repository trait for User persistence
pub trait UserRepository {
    fn find_by_id(&self, id: &UserId) -> Option<User>;
    fn save(&mut self, user: User) -> Result<(), RepositoryError>;
    fn delete(&mut self, id: &UserId) -> Result<(), RepositoryError>;
    fn find_all(&self) -> Vec<User>;
}

/// Repository trait for Task persistence
pub trait TaskRepository {
    fn find_by_id(&self, id: &TaskId) -> Option<Task>;
    fn save(&mut self, task: Task) -> Result<(), RepositoryError>;
    fn delete(&mut self, id: &TaskId) -> Result<(), RepositoryError>;
    fn find_by_assignee(&self, user_id: &UserId) -> Vec<Task>;
}

#[derive(Debug)]
pub enum RepositoryError {
    NotFound,
    Conflict,
    ConnectionError,
}

/// In-memory implementation of UserRepository
pub struct InMemoryUserRepository {
    users: Vec<User>,
}

impl InMemoryUserRepository {
    pub fn new() -> Self {
        Self { users: Vec::new() }
    }
}

impl Default for InMemoryUserRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl UserRepository for InMemoryUserRepository {
    fn find_by_id(&self, id: &UserId) -> Option<User> {
        self.users.iter().find(|u| u.id == *id).cloned()
    }

    fn save(&mut self, user: User) -> Result<(), RepositoryError> {
        self.users.push(user);
        Ok(())
    }

    fn delete(&mut self, id: &UserId) -> Result<(), RepositoryError> {
        if let Some(pos) = self.users.iter().position(|u| u.id == *id) {
            self.users.remove(pos);
            Ok(())
        } else {
            Err(RepositoryError::NotFound)
        }
    }

    fn find_all(&self) -> Vec<User> {
        self.users.clone()
    }
}
