const supabase = require('../config/supabaseClient');

const paymentMethodsRepository = {
  /**
   * Retrieve all payment methods.
   * @returns {Promise<Array>} List of payment methods.
   */
  findAll: async () => {
    const { data, error } = await supabase
      .from('paymentMethods')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching payment methods:', error.message);
      throw error;
    }
    return data;
  }
};

module.exports = paymentMethodsRepository;
