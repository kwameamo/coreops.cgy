// Simple storage wrapper using localStorage
const storage = {
    async get(key) {
      try {
        const value = localStorage.getItem(key);
        return value ? { key, value } : null;
      } catch (error) {
        console.error('Storage get error:', error);
        return null;
      }
    },
  
    async set(key, value) {
      try {
        localStorage.setItem(key, value);
        return { key, value };
      } catch (error) {
        console.error('Storage set error:', error);
        return null;
      }
    },
  
    async delete(key) {
      try {
        localStorage.removeItem(key);
        return { key, deleted: true };
      } catch (error) {
        console.error('Storage delete error:', error);
        return null;
      }
    }
  };
  
  // Make it available globally
  window.storage = storage;
  
  export default storage;