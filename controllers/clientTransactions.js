const TransactionModel = require('../models/TransactionModel.js');
const pool = require('../config/database.js');

module.exports = {
    
    transactionsGet: async (req, res) => {
        let message = "";
        try {
            const clientId = req.session.utilisateur.id;
            const {transactionTypeId, compteSourceId} = req.query;
            const donneesFlash = req.flash('donnees')[0] || {};
            const donnees = {
                transactionTypeId: transactionTypeId || donneesFlash.transactionTypeId || '',
                compte_source: compteSourceId || donneesFlash.compte_source || '',
                compte_destination: donneesFlash.compte_destination || '',
                montant: donneesFlash.montant || ''
            };                    
            let sources = [];
            if (donnees.transactionTypeId) {
                sources = await TransactionModel.getTransactionSources(clientId, donnees.transactionTypeId);
            }            
            
            let destinations = [];
            if (donnees.compte_source) {
                destinations = await TransactionModel.getTransactionDestinations(clientId,
                    donnees.transactionTypeId,
                    donnees.compte_source
                );
            }                    
            res.render('client/transactions', {
                transactionTypes: await TransactionModel.getClientTransactionTypes(),
                sources: sources,
                destinations: destinations,
                transactions: await TransactionModel.getTransactions(clientId, null, null),
                donnees: donnees,
                transactionTypeId: donnees.transactionTypeId,
                compteSourceId: donnees.compte_source
            });
        } catch (error) {
            if (error.sqlMessage){
                message = error.sqlMessage;
            }else{
                message = error;
            }
            req.flash('messages', message);
            res.redirect('/');
        }
    },

    transactionsPost: async (req, res) => {        
        let messages = [];
        let erreur = false;
        try {
            const clientId = req.session.utilisateur.id;
            const {transactionTypeId, compte_source, compte_destination, montant} = req.body;
            if (!transactionTypeId || !compte_source || !compte_destination || !montant) {
                erreur = true;
                messages.push('Veuillez rensigner tous les champs obligatoires (*)');
            }
            if (!erreur && (!montant || isNaN(montant) || parseFloat(montant) <= 0)) {
                erreur = true;
                messages.push('Le montant doit être un nombre positif');
            }
            if (!erreur){
                const results = await TransactionModel.doTransaction(
                    clientId,
                    transactionTypeId,
                    compte_source,
                    compte_destination,
                    parseFloat(montant)
                );
                results.forEach(m => messages.push(m));
            }
            req.flash('messages', messages);
            if(erreur){                
                req.flash('donnees', req.body);
                return res.redirect('/client/transactions');
            }else{
                res.redirect('/client/transactions');
            } 
        } catch (error) {
            if (error.sqlMessage){
                messages.push(error.sqlMessage);
            }else{
                messages.push(error);
            }
            req.flash('messages', messages);
            req.flash('donnees', req.body);
            return res.redirect('/client/transactions');
        }
    }
};