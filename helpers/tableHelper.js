module.exports = (data) => {
    
    if (data && data.length) {
        const headers = data[0];
        const rows = data.slice(1);        
        return `
            <div class="table-container">
                <div class="table-header">
                    ${headers.map((h, index) => 
                        `<div class="table-header-cell">${h}</div>`
                    ).join('')}
                </div>
                
                <div class="table-body-scroll">
                    <div class="table-body">
                        ${rows.map((row) => `
                            <div class="table-row">
                                ${row.map((cell, index) => 
                                    `<div class="table-cell">${cell}</div>`
                                ).join('')}
                            </div>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    return '';
};