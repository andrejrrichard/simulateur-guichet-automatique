const pool = require('../config/database.js');
const CompteModel = require('./CompteModel');
const GuichetModel = require('./GuichetModel');
const BanqueModel = require('./BanqueModel');

const TransactionModel = {

    getAllTransactionTypes: async () => {
        try {
            const [rows] = await pool.query(`
                SELECT * FROM transaction_type
            `);
            return rows;
        } catch (error) {
            console.log('Erreur TransactionModel.getAllTransactionTypes:', error);
            throw error;
        }
    },

    getTransactions: async (usagerId, transactionTypeId, compteTypeId) => {
        try {
            const [rows] = await pool.query(
                'CALL transactions_liste(?, ?, ?)',
                [usagerId, transactionTypeId, compteTypeId]
            );
            return rows[0];
        } catch (error) {
            console.log('Erreur TransactionModel.getTransactions:', error);
            throw error;
        }
    },

    getTransactionSources: async (usagerId, transactionTypeId) => {
        try {
            const [result] = await pool.query(
                'CALL get_compte_source_by_transaction_type(?, ?)',
                [usagerId, transactionTypeId]
            );
            return result[0] || [];
        } catch (error) {
            console.log('Erreur TransactionModel.getTransactionSources:', error);
            throw error;
        }
    },

    getTransactionDestinations: async (usagerId, transactionTypeId, compteSourceId) => {        
        try {
            const [result] = await pool.query(
                'CALL get_compte_destinations_by_transaction_type_and_compte_source(?, ?, ?)',
                [usagerId, transactionTypeId, compteSourceId]
            );
            return result[0] || [];
        } catch (error) {
            console.log('Erreur TransactionModel.getTransactionDestinations:', error);
            throw error;
        }
    },

    getClientTransactionTypes: async () => {
        try {
            const [rows] = await pool.query(`
                SELECT * FROM transaction_type WHERE client = TRUE
            `);
            return rows;
        } catch (error) {
            console.log('Erreur TransactionModel.getClientTransactionTypes:', error);
            throw error;
        }
    },

    getTransactionTypeId: async (code) => {
        try {
            const  transactionTypes = await TransactionModel.getAllTransactionTypes()
            const transactionType = transactionTypes.find(type => 
                type.code.toLowerCase().includes(code.toLowerCase())
            );
            return transactionType.id || null;            

        } catch (error) {
            console.log('Erreur TransactionModel.getTransactionTypeId:', error);
            throw error;
        }
    },
    
    getTransactionTypeCode: async (id) => {
        try {
            const  transactionTypes = await TransactionModel.getAllTransactionTypes()
            const transactionType = transactionTypes.find(type => type.id == id);
            return transactionType.code || null; 
        } catch (error) {
            console.log('Erreur TransactionModel.getTransactionTypeCode:', error);
            throw error;
        }
    },

    transaction: async (clientId, transactionTypeId, compteSourceId, compteDestinationId, montant) => {
        try {
            await pool.execute(
                'CALL effectuer_transfert(?, ?, ?, ?, ?)',
                [clientId, transactionTypeId, compteSourceId, compteDestinationId, montant]
            );  
        } catch (error) {
            console.log('Erreur TransactionModel.transaction:', error);
            throw error;
        }
    },

    _retrait: async (clientId, transactionTypeId, compteSourceId, compteDestinationId, montant) => {
        try {   
            let messages = [];   
            if (montant % 10 !== 0) throw new Error('Les retraits doivent être des multiples de 10$').message;
            if (montant > 1000) throw new Error('Retrait maximum de 1000$').message;
            if (await GuichetModel.getSolde() < montant) throw new Error("Impossible de retirer de l'argent présentement").message;  
            const compteSource = await CompteModel.getById(compteSourceId);
            if (!compteSource) throw new Error('Compte source non trouvé').message;
            if (compteSource.solde >= montant) {
                await TransactionModel.transaction(clientId, transactionTypeId, compteSourceId, compteDestinationId, montant);
            }else{
                const marge = await CompteModel.getComptesClientIdAndCompteType(clientId, 'MARGE_CREDIT');
                if(marge == null){
                    throw new Error('Fond insuffisant pour le retrait').message;
                }else{
                    await TransactionModel.transaction(
                        clientId,
                        await TransactionModel.getTransactionTypeId('TRANSFERT'),
                        marge.id,
                        compteSourceId,
                        montant - compteSource.solde
                    );
                    messages.push("Attention, la marge de crédit a été utilisée");
                    await TransactionModel.transaction(
                        clientId,
                        transactionTypeId,
                        compteSourceId,
                        compteDestinationId,
                        montant
                    );
                }
            }
            return messages;
        } catch (error) {
            console.log('Erreur TransactionModel._retrait:', error);
            throw error;
        }
    },

    _paiement: async (clientId, transactionTypeId, compteSourceId, compteDestinationId, montant) => {
        try {  
            let messages = [];   
            const frais = 1.25; 
            const compteSource = await CompteModel.getById(compteSourceId);
            if (!compteSource) throw new Error('Compte source non trouvé').message;     
            const compteDestination = await CompteModel.getById(compteDestinationId);
            if (!compteDestination) throw new Error('Compte destination non trouvé').message;   
            if (compteSource.solde >= (montant + frais)) {
                // frais
                await TransactionModel.transaction(
                    clientId,
                    await TransactionModel.getTransactionTypeId('PRELEVEMENT'),
                    compteSourceId,
                    await BanqueModel.getCompteId(),
                    frais
                );
                await TransactionModel.transaction(clientId, transactionTypeId, compteSourceId, compteDestinationId, montant);
            }else{
                const marge = await CompteModel.getComptesClientIdAndCompteType(clientId, 'MARGE_CREDIT');
                if(marge == null){
                    throw new Error('Fond insuffisant pour le paiement').message;
                }else{
                    await TransactionModel.transaction(
                        clientId,
                        await TransactionModel.getTransactionTypeId('TRANSFERT'),
                        marge.id,
                        compteSourceId,
                        (montant + frais) - compteSource.solde
                    );
                    messages.push("Attention, la marge de crédit a été utilisée");
                    // frais
                    await TransactionModel.transaction(
                        clientId,
                        await TransactionModel.getTransactionTypeId('PRELEVEMENT'),
                        compteSourceId,
                        await BanqueModel.getCompteId(),
                        frais
                    );
                    await TransactionModel.transaction(
                        clientId,
                        transactionTypeId,
                        compteSourceId,
                        compteDestinationId,
                        montant
                    );
                }
            }
            return messages;
        } catch (error) {
            console.log('Erreur TransactionModel._paiement:', error);
            throw error;
        }
    },

    _transfert: async (clientId, transactionTypeId, compteSourceId, compteDestinationId, montant) => {
        try {  
            let messages = [];   
            const compteSource = await CompteModel.getById(compteSourceId);
            if (!compteSource) throw new Error('Compte source non trouvé').message;     
            const compteDestination = await CompteModel.getById(compteDestinationId);
            if (!compteDestination) throw new Error('Compte destination non trouvé').message;   
            if (compteSource.solde >= montant) {
                await TransactionModel.transaction(clientId, transactionTypeId, compteSourceId, compteDestinationId, montant);
            }else{
                const marge = await CompteModel.getComptesClientIdAndCompteType(clientId, 'MARGE_CREDIT');
                if(marge == null){
                    throw new Error('Fond insuffisant pour le transfert').message;
                }else{
                    await TransactionModel.transaction(
                        clientId,
                        await TransactionModel.getTransactionTypeId('TRANSFERT'),
                        marge.id,
                        compteSourceId,
                        montant - compteSource.solde
                    );
                    messages.push("Attention, la marge de crédit a été utilisée");
                    await TransactionModel.transaction(
                        clientId,
                        transactionTypeId,
                        compteSourceId,
                        compteDestinationId,
                        montant
                    );
                }
            }
            return messages;
        } catch (error) {
            console.log('Erreur TransactionModel._paiement:', error);
            throw error;
        }
    },

    doTransaction: async (clientId, transactionTypeId, compteSourceId, compteDestinationId, montant) => {
        try {
            let messages = [];
            let results = null;
            switch(await TransactionModel.getTransactionTypeCode(transactionTypeId)) {
                case 'RETRAIT':
                    results = await TransactionModel._retrait(
                        clientId, transactionTypeId, 
                        compteSourceId, compteDestinationId, 
                        montant
                    );
                    results.forEach(m => messages.push(m));
                    break;

                case 'TRANSFERT':
                    results = await TransactionModel._transfert(
                        clientId, transactionTypeId, 
                        compteSourceId, compteDestinationId, 
                        montant
                    );
                    results.forEach(m => messages.push(m));
                    break;

                case 'PAIEMENT':
                    results = await TransactionModel._paiement(
                        clientId, transactionTypeId, 
                        compteSourceId, compteDestinationId, 
                        montant
                    );
                    results.forEach(m => messages.push(m));
                    break;

                default:
                    await TransactionModel.transaction(clientId, transactionTypeId, compteSourceId, compteDestinationId, montant);                  
                    break;
            }
            messages.push('Transaction effectuée avec succès');
            return messages;
        } catch (error) {
            console.log('Erreur TransactionModel.doTransaction:', error);
            throw error;
        }
    }
};

module.exports = TransactionModel;