// For demo purposes only
const Web3 = require('web3');
const validateSchema = require('jsonschema').validate;
const config = require("../config/config");
const ethUtil = require('ethereumjs-util'); 
const lengthConstants = require("../../lib/dataStructureLengths");
const assert = require('assert');

const {PlasmaTransaction,
    TxTypeFund, 
    TxTypeMerge, 
    TxTypeSplit, 
    TxTypeWithdraw, 
    TxTypeTransfer,
    TxLengthForType,
    NumInputsForType, 
    NumOutputsForType} = require("../../lib/Tx/tx");

const transactionSchema = 
{
    // "from": {"type": "string", "minLength": 40, "maxLength": 42},
    "txType" : {"type" : "integer", "minimum" : 1, "maximum" : 5},
    "inputs": {
        "type": "array",
        "items": {"type": "object",
            "properties": {
            "blockNumber": {"type": "integer", "minimum": 1},
            "txNumber": {"type": "integer", "minimum": 1},
            "outputNumber" : {"type": "integer", "minimum": 1}
            }
        }
    },
    "outputs": {
        "type": "array",
        "items": {"type": "object",
            "properties": {
            "to": {"type": "string", "minLength": 40, "maxLength": 42},
            "amount": {"type": "string", "minLength": 1},  
            }
        }
    },
    "required": ["txType", "inputs"]
}
module.exports = function(app, levelDB, web3) {
    const createTxFromJSON = require('../helpers/createTxFromJson')(levelDB);
    const createWithdrawTxFromJSON = require('../helpers/createWithdrawTxFromJson')(levelDB);
    app.post('/createTX', 'createTX', async function(req, res){
        try{ 
            if (!validateSchema(req.body, transactionSchema).valid) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            let tx;
            if (req.body.txType == TxTypeMerge || req.body.txType == TxTypeSplit || req.body.txType == TxTypeTransfer) {
                tx = await createTxFromJSON(req.body);
            } else {
                tx = await createWithdrawTxFromJSON(req.body);
            }
            const txErrors = tx.validate(true);
            assert(txErrors=='Invalid Signature');
            const txRawNoNumber = Buffer.concat(tx.clearRaw(false, false));
            const txJSONrepresentation = tx.toFullJSON(true);
            const prefix = ethUtil.toBuffer("\x19Ethereum Signed Message:\n" + txRawNoNumber.length)
            const stringToSign = prefix.toString('hex') + txRawNoNumber.toString('hex');
            const txPersonalHash = tx.hash(false, false);
            return res.json({error: false, 
                tx: txJSONrepresentation, 
                txHex: "0x"+txRawNoNumber.toString('hex'),
                txPersonalHash: "0x"+txPersonalHash.toString('hex'),
                txPersonalMessage: "0x"+stringToSign});
        }
        catch(error){
            res.json({error: true, reason: "invalid transaction"});
        }
    });
}