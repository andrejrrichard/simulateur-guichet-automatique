const UsagerModel = require('../models/UsagerModel.js');
const CompteModel = require('../models/CompteModel.js');
const TransactionModel = require('../models/TransactionModel.js');

module.exports = {

    transactionsGet: async (req, res) => {
        let message = "";
        try {
            res.render('admin/transactions', {
                usagers: await UsagerModel.getAll(false),
                transactionTypes: await TransactionModel.getAllTransactionTypes(),
                compteTypes: await CompteModel.getAllCompteTypes(),
                transactions: await TransactionModel.getTransactions(res.locals.donnees.usagerId || null,
                     res.locals.donnees.transactionTypeId || null,
                     res.locals.donnees.compteTypeId || null)
            });
        } catch (error) {
            if (error.sqlMessage) {
                message = error.sqlMessage;
            } else {
                message = error;
            } 
            req.flash('messages', error);
            res.redirect('/');
        }
    },

    transactionsPost: async (req, res) => {
        req.flash('donnees', req.body);
        return res.redirect('/admin/transactions');
    }
};