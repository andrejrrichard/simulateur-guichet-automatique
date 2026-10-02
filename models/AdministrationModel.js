const CompteModel = require('./CompteModel.js');
const BanqueModel = require('./BanqueModel.js');
const TransactionModel = require('./TransactionModel.js');

const AdministrationModel = {

    payerInteretComptesEpargne: async (taux) => {
        try {
            const comptesEpargne = await CompteModel.getComptesClientsParType('EPARGNE');
            const comptes = comptesEpargne.filter(compte => compte.solde > 0.00);    
            let interets = 0.00;
            const comptesAPayer = [];            
            for (const compte of comptes) {
                const interet = compte.solde * (taux / 100);
                if (interet > 0.00) {
                    interets += interet;
                    comptesAPayer.push({
                        compteId: compte.id,
                        interet: interet
                    });
                }
            }            
            if (interets > await BanqueModel.getSolde()) {
                throw new Error('Le solde de la banque est insuffisant').message;
            }
            for (const compte of comptesAPayer) {
                await TransactionModel.doTransaction(
                    await BanqueModel.getCompteUsagerId(),
                    await TransactionModel.getTransactionTypeId('INTERET'),
                    await BanqueModel.getCompteId(),
                    compte.compteId,
                    compte.interet
                );               
            }            
        } catch (error) {
            console.log('Erreur AdministrationModel.payerInteretComptesEpargne:', error);
            throw error;
        }
    },

    preleverInteretComptesMargeCredit: async (taux) => {
        try {
            const comptesMarge = await CompteModel.getComptesClientsParType('MARGE_CREDIT');
            const comptes = comptesMarge.filter(compte => compte.solde > 0.00);
            for (const compte of comptes) {             
                const interet = compte.solde * (taux / 100);
                if (interet > 0.00) {
                    await TransactionModel.doTransaction(
                        await BanqueModel.getCompteUsagerId(),
                        await TransactionModel.getTransactionTypeId('INTERET'),                            
                        compte.id,
                        await BanqueModel.getCompteId(),
                        interet
                    );
                }
            }            
        } catch (error) {
            console.log('Erreur AdministrationModel.preleverInteretComptesMargeCredit:', error);
            throw error;
        }
    },

    prelevementHypothecaire: async (compteHypothecaireId, montant) => {
        try {            
            let compte = await CompteModel.getById(compteHypothecaireId);
            if(compte){ 
                let message = null;
                let transactionPermise = true;
                if(montant > compte.solde) {
                    transactionPermise = false;
                    const compteMargeCredit = await CompteModel.getComptesClientIdAndCompteType(compte.usager_id, 'MARGE_CREDIT');
                    if(compteMargeCredit){
                        await TransactionModel.transaction(
                            await BanqueModel.getCompteUsagerId(),
                            await TransactionModel.getTransactionTypeId('TRANSFERT'),   
                            compteMargeCredit.id,                         
                            compte.id,                                
                            montant - compte.solde
                        );
                        message = "Attention, la marge de crédit du client a été utilisée";
                        transactionPermise = true;
                    }else{
                        throw new Error("Le client n'a pas de marge de crédit").message;
                    }
                }
                if(transactionPermise) {                    
                    await TransactionModel.doTransaction(
                        await BanqueModel.getCompteUsagerId(),
                        await TransactionModel.getTransactionTypeId('PRELEVEMENT'),                            
                        compte.id,
                        await BanqueModel.getCompteId(),
                        montant
                    );
                }
                return message;
            }else{
                throw new Error("Le client n'a pas de compte hypothécaire").message;
            }
        } catch (error) {
            console.log('Erreur AdministrationModel.prelevementHypothecaire:', error);
            throw error;
        }
    }
};

module.exports = AdministrationModel;