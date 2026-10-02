const CompteModel = require('../models/CompteModel.js');
const GuichetModel = require('../models/GuichetModel.js');
const BanqueModel = require('../models/BanqueModel.js');
const AdministrationModel = require('../models/AdministrationModel.js');

module.exports = {
    
    administrationGet: async (req, res) => {        
        let message = "";
        try {
            res.render('admin/administration', {
                guichet_etat: req.guichetEtat,
                guichet_solde: await GuichetModel.getSolde(),
                guichet_depot: await GuichetModel.getDepot(),
                banque_solde: await BanqueModel.getSolde(),
                comptes_hypothecaire: await CompteModel.getComptesClientsParType('HYPOTHECAIRE')
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

    administrationPost: async (req, res) => {
        let messages = [];
        let erreur = false;        
        try {
            const {action, montant_deposer, compte_hypothecaire_id, montant_prelever} = req.body;
            if (action === 'guichet_toggle') {
                await GuichetModel.toggleOuvrirFermer();
                messages.push('État du guichet modifié');
            } else {
                if (!req.guichetEtat) {
                    messages.push('Le guichet est fermé actuellement');
                } else {                    
                    switch (action) {                        
                        case 'remplir_guichet':
                            if (!montant_deposer || isNaN(montant_deposer) || parseFloat(montant_deposer) <= 0) {
                                messages.push('Le montant doit être un nombre positif');
                                erreur = true;
                            }else{
                                await GuichetModel.remplir(parseFloat(montant_deposer));
                                messages.push('Montant déposé dans le guichet');
                            }     
                            break;

                        case 'payer_interets':
                            await AdministrationModel.payerInteretComptesEpargne(1);
                            messages.push("Intérêts payés sur les comptes d'épargne");
                            break;

                        case 'prelever_interets':
                            await AdministrationModel.preleverInteretComptesMargeCredit(5);
                            messages.push('Intérêts prélevés sur les marges de crédit');
                            break;

                        case 'prelevement_hypothecaire':
                            if (!montant_prelever || isNaN(montant_prelever) || parseFloat(montant_prelever) <= 0) {
                                messages.push('Le montant doit être un nombre positif');
                                erreur = true;
                            }else{
                                let result = await AdministrationModel.prelevementHypothecaire(
                                    compte_hypothecaire_id,
                                    parseFloat(montant_prelever)
                                );
                                if(result) messages.push(result);
                                messages.push('Prélèvement effectué avec succès');
                            }                             
                            break;
                    }
                }
            }
            req.flash('messages', messages);
            if(erreur){                
                req.flash('donnees', req.body);
                return res.redirect('/admin/administration');
            }else{
                res.redirect('/admin/administration');
            }
        } catch (error) {
            if (error.sqlMessage){
                messages.push(error.sqlMessage);
            }else{
                messages.push(error);
            }
            req.flash('messages', messages);
            req.flash('donnees', req.body);
            return res.redirect('/admin/administration');
        }
    }
};