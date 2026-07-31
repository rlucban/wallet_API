const supabase = require('../config/supabaseClient');

const userRepository = {
  findByName: async (name) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', name)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
      throw error;
    }
    return data;
  },

  findById: async (id) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  },

  createUser: async (user) => {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },

  updateSessionId: async (id, sessionId) => {
    const { data, error } = await supabase
      .from('users')
      .update({ currentSessionId: sessionId })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },

  deleteUser: async (id) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
    return true;
  }
};

module.exports = userRepository;
