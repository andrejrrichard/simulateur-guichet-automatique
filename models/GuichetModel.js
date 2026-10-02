const pool = require('../config/database.js');

const GuichetModel = {

    toggleOuvrirFermer: async () => {
        try {
            await pool.execute('UPDATE guichet_etat SET etat = NOT etat');
        } catch (error) {
            console.log('Erreur GuichetModel.toggleOuvrirFermer:', error);
            throw error;
        }
    },

    remplir: async (montant) => {
        try {
            await pool.execute('CALL remplir_guichet(?)', [montant]);
        } catch (error) {
            console.log('Erreur GuichetModel.remplir:', error);
            throw error;
        }
    },

    getSolde: async () => {
        try {            
            const [rows] = await pool.query('SELECT solde FROM vue_compte_guichet');
            return rows[0]?.solde || 0;
        } catch (error) {
            console.log('Erreur GuichetModel.getSolde:', error);
            throw error;
        }
    },

    getDepot: async () => {
        try {            
            const [rows] = await pool.query('SELECT solde FROM vue_compte_depot');
            return rows[0]?.solde || 0;
        } catch (error) {
            console.log('Erreur GuichetModel.getDepot:', error);
            throw error;
        }
    },

    getEtat: async () => {
        try {       
            const [rows] = await pool.query(
                'SELECT etat FROM guichet_etat'
            );
            return Boolean(rows[0]?.etat);
        } catch (error) {
            console.log('Erreur GuichetModel.getEtat:', error);
            throw error;
        }
    }
};

module.exports = GuichetModel;