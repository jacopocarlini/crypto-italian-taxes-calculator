const fs = require('fs');
const csv = require('csv-parser');
const fastcsv = require('fast-csv');
const {format} = require('date-fns');

const inputFilePath = './binance.csv';
const outputFilePath = 'output.csv';

// Funzione per convertire e scrivere il CSV
function convertCSV(inputFile, outputFile) {
    const rows = [];

    fs.createReadStream(inputFile)
        .pipe(csv())
        .on('data', (row) => {
            // Convertire la data da 'YYYY-MM-DD HH:MM' a 'DD/MM/YYYY'
            const date = format(new Date(row.Date), 'dd/MM/yyyy');

            // Determinare i valori di type, quantity e price
            let type, quantity, price;
            if (row.Type === 'Buy') {
                type = row['Received Currency'];
                quantity = row['Received Amount'];
                price = row['Sent Amount'] / row['Received Amount'];
            } else {
                type = row['Sent Currency'];
                quantity = -row['Sent Amount'];
                price = row['Received Amount'] / row['Sent Amount'];
            }

            // Aggiungi la riga trasformata alla lista dei risultati
            rows.push({
                type: type,
                date: date,
                quantity: quantity,
                price: price
            });
        })
        .on('end', () => {
            // Scrivi i risultati nel file di output
            const writeStream = fs.createWriteStream(outputFile);
            fastcsv
                .write(rows, {headers: true})
                .pipe(writeStream)
                .on('finish', () => {
                    console.log('Conversione completata. File di output salvato in', outputFile);
                });
        });
}

// Chiamata alla funzione per convertire il CSV
convertCSV(inputFilePath, outputFilePath);
