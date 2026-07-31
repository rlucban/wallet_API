const supabase = require('../config/supabaseClient');

const dueRepository = {
  findAll: async (userId, filters = {}) => {
    let query = supabase
      .from('dues')
      .select('*')
      .eq('userId', userId)
      .order('date', { ascending: true });

    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }
    if (filters.completed !== undefined) {
      query = query.eq('completed', filters.completed);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  findById: async (id, userId) => {
    const { data, error } = await supabase
      .from('dues')
      .select('*')
      .eq('id', id)
      .eq('userId', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  },

  create: async (due) => {
    const { data, error } = await supabase
      .from('dues')
      .insert([due])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (id, userId, updates) => {
    const { data, error } = await supabase
      .from('dues')
      .update(updates)
      .eq('id', id)
      .eq('userId', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id, userId) => {
    const { error } = await supabase
      .from('dues')
      .delete()
      .eq('id', id)
      .eq('userId', userId);

    if (error) throw error;
    return true;
  }
};

module.exports = dueRepository;
