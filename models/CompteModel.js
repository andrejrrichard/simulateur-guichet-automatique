const pool = require('../config/database.js');

const CompteModel = {
    
    getCompteTypesClient: async () => {
        try {
            const [rows] = await pool.query(`
                SELECT id, code FROM compte_type
                WHERE compte_type.client = 1
            `);
            return rows;
        } catch (error) {
            console.log('Erreur CompteModel.getCompteTypesClient:', error);
            throw error;
        }
    },

    getComptesClients: async () => {
        try {
            const [rows] = await pool.query('SELECT * FROM vue_comptes WHERE administrateur=FALSE');
            return rows;
        } catch (error) {
            console.log('Erreur CompteModel.getComptesClients:', error);
            throw error;
        }
    },

    createCompteClient: async (clientId, typeCompteId) => {
        try {
            await pool.execute(
                'CALL creer_compte_client(?, ?)',
                [clientId, typeCompteId]
            );
        } catch (error) {
            console.log('Erreur CompteModel.createCompteClient:', error);
            throw error;
        }
    },

    getAllCompteTypes: async () => {
        try {
            const [rows] = await pool.query(`
                SELECT id, code FROM compte_type
            `);
            return rows;
        } catch (error) {
            console.log('Erreur CompteModel.getAllCompteTypes:', error);
            throw error;
        }
    },

    getComptesClientIdAndCompteType: async (clientID, type) => {
        try {
            const comptesClient = await CompteModel.getComptesClients()
            const compte = comptesClient.find(compte => 
                compte.compte_type.toLowerCase().includes(type.toLowerCase()) &&
                compte.usager_id == clientID
            );  
            return compte || null;
        } catch (error) {
            console.log('Erreur CompteModel.getComptesClientIdAndCompteType:', error);
            throw error;
        }
    },

    getComptesByUserId: async (userId) => {
        try {
            const comptesClient = await CompteModel.getComptesClients()
            return comptesClient.filter(compte => 
                compte.usager_id == userId
            );   
        } catch (error) {
            console.log('Erreur CompteModel.getComptesByUserId:', error);
            throw error;
        }
    },

    getById: async (id) => {
        try {
            const [rows] = await pool.query(
                `SELECT * FROM compte WHERE compte.id = ?`,
                [id]
            );
            return rows[0] || null;
        } catch (error) {
            console.log('Erreur CompteModel.getById:', error);
            throw error;
        }
    },

    getComptesClientsParType: async (type) => {
        try {
            const comptesClient = await CompteModel.getComptesClients()
            return comptesClient.filter(compte => 
                compte.compte_type.toLowerCase().includes(type.toLowerCase())
            );            
        } catch (error) {
            console.log('Erreur CompteModel.getComptesClientsParType:', error);
            throw error;
        }
    }
};

module.exports = CompteModel;