const supabase = require('../config/supabaseClient');

const categoryRepository = {
  findAll: async (userId = null) => {
    let query = supabase
      .from('categories')
      .select('*');

    if (userId) {
      // Logged in → global + user categories
      query = query.or(`isGlobal.eq.true,userId.eq.${userId}`);
    } else {
      // Not logged in → only global
      query = query.eq('isGlobal', true);
    }

    const { data, error } = await query.order('name');

    if (error) throw error;
    return data ?? [];
  },

  findById: async (id) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  },

  create: async (category) => {
    const { data, error } = await supabase
      .from('categories')
      .insert([category])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};

module.exports = categoryRepository;
