const fs = require('fs');
const csv = require('csv-parser');
const fastcsv = require('fast-csv');
const {parse, format} = require('date-fns');

const inputFilePath = './binance/.csv';
const outputFilePath = './output.csv';

// Funzione per convertire e scrivere il CSV
function convertCSV(inputFile, outputFile) {
    const writeStream = fs.createWriteStream(outputFile);
    const csvWriter = fastcsv.write(writeStream, {headers: true});

    fs.createReadStream(inputFile)
        .pipe(csv())
        .on('data', (row) => {
            // Convertire la data da 'YYYY-MM-DD HH:MM' a 'DD/MM/YYYY'
            const date = format(new Date(row.Date), 'dd/MM/yyyy');

            // Determinare i valori di type, quantity e amount
            let type, quantity, amount;
            if (row.Type === 'Buy') {
                type = row['Received Currency'];
                quantity = row['Received Amount'];
                amount = row['Sent Amount'];
            } else {
                type = row['Sent Currency'];
                quantity = row['Sent Amount'];
                amount = row['Received Amount'];
            }

            // Scrivere la riga trasformata nel file di output
            csvWriter.write({
                type: type,
                date: date,
                quantity: quantity,
                amount: amount
            });
        })
        .on('end', () => {
            csvWriter.end();
            console.log('Conversione completata. File di output salvato in', outputFile);
        });
}

// Chiamata alla funzione per convertire il CSV
convertCSV(inputFilePath, outputFilePath);
