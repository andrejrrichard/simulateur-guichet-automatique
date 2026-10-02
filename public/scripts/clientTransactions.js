document.addEventListener('DOMContentLoaded', function() {
    const etapes = {
        1: {element: document.getElementById('etape1'), input: document.getElementById('transactionTypeSelect')},
        2: {element: document.getElementById('etape2'), input: document.getElementById('sourceSelect')},
        3: {element: document.getElementById('etape3'), input: document.getElementById('destSelect')},
        4: {element: document.getElementById('etape4'), input: document.querySelector('input[name="montant"]')}
    };
    
    function montreEtape(numero) {
        for (let i = 1; i <= 4; i++) {
            if (etapes[i]?.element) {
                if (i === numero) {
                    etapes[i].element.style.display = 'block';
                } else if (i > numero) {
                    etapes[i].element.style.display = 'none';
                }
            }
        }
    }
    
    function redirigerAvecParametres(transactionTypeId, compteSourceId) {
        let url = '/client/transactions';
        const params = [];
        
        if (transactionTypeId) params.push(`transactionTypeId=${transactionTypeId}`);
        if (compteSourceId) params.push(`compteSourceId=${compteSourceId}`);
        
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        window.location.href = url;
    }
    
    function init() {
        // Montrer les étapes selon les valeurs présentes
        if (etapes[1].input && etapes[1].input.value) {
            montreEtape(2);
        }
        
        if (etapes[2].input && etapes[2].input.value) {
            montreEtape(3);
        }
        
        if (etapes[3].input && etapes[3].input.value) {
            montreEtape(4);
        }
    }
    
    // Gestionnaires d'événements
    if (etapes[1].input) {
        etapes[1].input.addEventListener('change', function() {
            if (this.value) {
                redirigerAvecParametres(this.value, '');
            } else {
                redirigerAvecParametres('', '');
            }
        });
    }
    
    if (etapes[2].input) {
        etapes[2].input.addEventListener('change', function() {
            const transactionTypeId = etapes[1].input?.value;
            if (this.value && transactionTypeId) {
                redirigerAvecParametres(transactionTypeId, this.value);
            } else if (!this.value && transactionTypeId) {
                redirigerAvecParametres(transactionTypeId, '');
            }
        });
    }
    
    if (etapes[3].input) {
        etapes[3].input.addEventListener('change', function() {
            montreEtape(4);
        });
    }

    init();
});