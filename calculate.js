let fs = require('fs');
let csvParse = require('csv-parser');
const {parse, differenceInDays} = require('date-fns');


const finalPrice = {
    BTC: 38415.6,
    ETH: 2074.32,
    MATIC: 0.8824,
    BNB: 283.5,
    SOL: 92.18,
    ADA: 0.5404,
}

const initialPrice = {
    BTC: 15469.0,
    ETH: 1117.41,
    MATIC: 0.7084,
    BNB: 227.4,
    SOL: 9.30,
    ADA: 0.2333
}


main();

function main() {
    let transactions = [];

    fs.createReadStream("./output.csv")
        .pipe(csvParse({
            mapValues: ({header, index, value}) => {
                if (header === 'date') {
                    // return convertToDate(value);
                    return value;

                }
                if (header === 'type') {
                    return value;
                }
                return parseFloat(value);
            }
        }))
        .on('data', function (csvrow) {
            transactions.push(csvrow);
        })
        .on('end', function () {
            const groupedTransactions = {};
            transactions.forEach(transaction => {
                const type = transaction.type;
                if (!groupedTransactions[type]) {
                    groupedTransactions[type] = [];
                }
                groupedTransactions[type].push(transaction);
            });

            // Calcola per ciascun tipo
            Object.keys(groupedTransactions).forEach(type => {
                let res = calculate(type, groupedTransactions[type]);
                // console.log(`Type: ${type}`, res);
            });

        });

}

function calculate(type, transactions) {
    let result = []
    let structBought = [];
    for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        if (transaction.quantity > 0) {
            structBought.push(transaction);
        }
        if (transaction.quantity < 0) {

            let index = structBought.length - 1; //last bought
            let remain = -transaction.quantity;

            // Gestione delle vendite parziali
            while (index >= 0 && remain > 0) {

                if (structBought[index].quantity <= 0) {
                    index -= 1;
                    continue;
                }

                let partialQuantity = Math.min(remain, structBought[index].quantity);
                const row = {
                    quantity: partialQuantity,
                    initialValue: structBought[index].price * partialQuantity,
                    finalValue: transaction.price * partialQuantity,
                    initialDate: structBought[index].date,
                    finalDate: transaction.date,
                }
                result.push(row); // Aggiungi al risultato la quantità venduta

                const newRemain = remain - structBought[index].quantity

                structBought[index].quantity -= remain;
                if (structBought[index].quantity < 0) {
                    structBought[index].quantity = 0;
                }

                remain = newRemain;
                index -= 1;
            }
            if (remain > 0) {
                const row = {
                    quantity: remain,
                    initialValue: remain * initialPrice[type],
                    finalValue: remain * transaction.price,
                    initialDate: '01/01/2023',
                    finalDate: transaction.date,
                }
                result.push(row);

                remain = 0;
            }

            structBought = structBought.filter(item => item.quantity !== 0);
        }
    }

    // Calcola il valore finale delle quantità rimanenti al 31 dicembre 2023
    for (let i = 0; i < structBought.length; i++) {
        const row = {
            quantity: structBought[i].quantity,
            initialValue: structBought[i].quantity * structBought[i].price,
            finalValue: structBought[i].quantity * parseFloat(finalPrice[`${type}`]),
            initialDate: structBought[i].date,
            finalDate: '31/12/2023',
        }
        result.push(row);
    }


    // Calcola i dettagli finali per ogni transazione nel risultato
    for (let i = 0; i < result.length; i++) {
        result[i].days = Math.ceil(diffInDays(result[i].initialDate, result[i].finalDate)) + 1;
    }

    // Calcola la somma di tutti gli initialValue
    const initialValueSum = Math.round(result.reduce((sum, item) => sum + item.initialValue, 0));

    // Calcola la somma di tutti i finalValue
    const finalValueSum = Math.round(result.reduce((sum, item) => sum + item.finalValue, 0));

    // Calcola la media pesata dei days rispetto al finalValue
    const weightedDaysAverage = Math.ceil(result.reduce((sum, item) => sum + (item.days * item.finalValue), 0) / finalValueSum);

    console.log(`---------------------------------------------------------------------`);
    console.log(`Currency ${type}`);
    console.log(`Valore Iniziale: ${initialValueSum}`);
    console.log(`Valore Finale: ${finalValueSum}`);
    console.log(`Giorni: ${weightedDaysAverage}`);

    return result;
}


function diffInDays(dateStr1, dateStr2) {
    let formatStr = 'dd/MM/yyyy';
    const date1 = parse(dateStr1, formatStr, new Date());
    const date2 = parse(dateStr2, formatStr, new Date());
    return differenceInDays(date2, date1);
}
