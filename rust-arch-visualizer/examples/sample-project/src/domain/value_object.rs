/// User identifier
#[derive(Debug, Clone, PartialEq)]
pub struct UserId(pub u64);

/// Email value object
#[derive(Debug, Clone)]
pub struct Email {
    value: String,
}

impl Email {
    pub fn new(value: String) -> Result<Self, EmailError> {
        if value.contains('@') {
            Ok(Self { value })
        } else {
            Err(EmailError::InvalidFormat)
        }
    }

    pub fn value(&self) -> &str {
        &self.value
    }
}

#[derive(Debug)]
pub enum EmailError {
    InvalidFormat,
    TooLong,
}
