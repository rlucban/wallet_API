const supabase = require('../config/supabaseClient');

const savingsItemRepository = {
  findAll: async (userId) => {
    const { data, error } = await supabase
      .from('savingsItems')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data;
  },

  findById: async (id, userId) => {
    const { data, error } = await supabase
      .from('savingsItems')
      .select('*')
      .eq('id', id)
      .eq('userId', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  create: async (data) => {
    const { data: result, error } = await supabase
      .from('savingsItems')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  update: async (id, userId, updateData) => {
    const { data, error } = await supabase
      .from('savingsItems')
      .update(updateData)
      .eq('id', id)
      .eq('userId', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id, userId) => {
    const { error } = await supabase
      .from('savingsItems')
      .delete()
      .eq('id', id)
      .eq('userId', userId);

    if (error) throw error;
    return true;
  }
};

module.exports = savingsItemRepository;
