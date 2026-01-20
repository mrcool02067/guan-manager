use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// 执行状态，用于管理正在运行的任务（如批量更新进度）
pub struct ExecState {
  pub inner: Arc<Mutex<HashMap<String, u32>>>,
}

impl Default for ExecState {
  fn default() -> Self {
    Self {
      inner: Arc::new(Mutex::new(HashMap::new())),
    }
  }
}
