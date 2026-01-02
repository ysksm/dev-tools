use crate::domain::{Email, Task, TaskId, User, UserId, UserRole};
use crate::repository::{RepositoryError, TaskRepository, UserRepository};

/// Service for user-related operations
pub struct UserService<R: UserRepository> {
    repository: R,
}

impl<R: UserRepository> UserService<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }

    pub fn register_user(
        &mut self,
        id: UserId,
        name: String,
        email: Email,
    ) -> Result<User, ServiceError> {
        let user = User::new(id, name, email);
        self.repository
            .save(user.clone())
            .map_err(|_| ServiceError::RegistrationFailed)?;
        Ok(user)
    }

    pub fn promote_to_admin(&mut self, id: &UserId) -> Result<(), ServiceError> {
        let mut user = self
            .repository
            .find_by_id(id)
            .ok_or(ServiceError::UserNotFound)?;
        user.change_role(UserRole::Admin);
        self.repository
            .save(user)
            .map_err(|_| ServiceError::UpdateFailed)?;
        Ok(())
    }

    pub fn get_user(&self, id: &UserId) -> Option<User> {
        self.repository.find_by_id(id)
    }

    pub fn list_all_users(&self) -> Vec<User> {
        self.repository.find_all()
    }
}

/// Service for task-related operations
pub struct TaskService<T: TaskRepository, U: UserRepository> {
    task_repository: T,
    user_repository: U,
}

impl<T: TaskRepository, U: UserRepository> TaskService<T, U> {
    pub fn new(task_repository: T, user_repository: U) -> Self {
        Self {
            task_repository,
            user_repository,
        }
    }

    pub fn create_task(&mut self, id: TaskId, title: String) -> Result<Task, ServiceError> {
        let task = Task::new(id, title);
        self.task_repository
            .save(task.clone())
            .map_err(|_| ServiceError::TaskCreationFailed)?;
        Ok(task)
    }

    pub fn assign_task(&mut self, task_id: &TaskId, user_id: &UserId) -> Result<(), ServiceError> {
        let user = self
            .user_repository
            .find_by_id(user_id)
            .ok_or(ServiceError::UserNotFound)?;

        let mut task = self
            .task_repository
            .find_by_id(task_id)
            .ok_or(ServiceError::TaskNotFound)?;

        task.assign(&user);

        self.task_repository
            .save(task)
            .map_err(|_| ServiceError::UpdateFailed)?;

        Ok(())
    }
}

#[derive(Debug)]
pub enum ServiceError {
    UserNotFound,
    TaskNotFound,
    RegistrationFailed,
    TaskCreationFailed,
    UpdateFailed,
}

impl From<RepositoryError> for ServiceError {
    fn from(err: RepositoryError) -> Self {
        match err {
            RepositoryError::NotFound => ServiceError::UserNotFound,
            _ => ServiceError::UpdateFailed,
        }
    }
}
