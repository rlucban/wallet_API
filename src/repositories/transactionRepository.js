const supabase = require('../config/supabaseClient');

const transactionRepository = {
  findAll: async (userId, filters = {}) => {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('userId', userId)
      .order('date', { ascending: false });

    // Apply optional filters
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.categoryId) {
      query = query.eq('categoryId', filters.categoryId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  findById: async (id, userId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('userId', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  },

  create: async (transaction) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single();

    if (error) {
      console.error("[Repository Create Error]:", JSON.stringify(error, null, 2));
      throw error;
    }
    return data;
  },

  update: async (id, userId, updates) => {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .eq('userId', userId)
      .select()
      .single();

    if (error) {
      console.error("[Repository Update Error]:", JSON.stringify(error, null, 2));
      throw error;
    }
    return data;
  },

  delete: async (id, userId) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('userId', userId);

    if (error) throw error;
    return true;
  }
};

module.exports = transactionRepository;
