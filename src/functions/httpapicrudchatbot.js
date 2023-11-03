const { app } = require('@azure/functions');
const mysql = require('promise-mysql');

app.http('httpapicrudchatbot', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);

        //const name = request.query.get('name') || await request.text() || 'world';
        const rutaAlArchivo = './DigiCertGlobalRootCA.crt(1).pem';
        try {            
        
            const connection = await mysql.createPool({
                host: 'serverchatbotmysql.mysql.database.azure.com',
                user: 'adminchatbot',
                password: 'd9AMmyVBS9fdXP',
                database: 'azuredbchatbot',
                ssl: {ca: `${rutaAlArchivo}`,
                        rejectUnauthorized: false,
                    },
            });

            if (request.method === 'GET') {
                // Manejar solicitud GET para obtener mensajes
                const sender = request.query.get('sender');
                const messages = await getChatsWithMessages(connection,  sender);
                context.res = {
                    body: JSON.stringify(messages),
                };
            } else if (request.method === 'POST') {
                // Manejar solicitud POST para guardar mensajes
                const requestData = request.body;
                const chatId = await saveConversation(connection, requestData);
                context.res = {
                    body: { chatId },
                };
            } else {
                context.res = {
                    status: 405,
                };
            }

            await connection.end();
        } catch (error) {
            context.error(`Error en la conexión a la base de datos: ${error.message}`);
            context.res = {
                status: 500,
                body: 'Error en la conexión a la base de datos',
            };
        }

        return context.res;
    }
});

async function getChatsWithMessages(connection, sender) {
    try {
        // Realiza la primera consulta para obtener chats del sender
        const chatsResult = await connection.query('SELECT date, id FROM chats WHERE sender = ?', [sender]);

        const chatsWithMessages = [];

        for (const chat of chatsResult) {
            // Realiza la segunda consulta para obtener mensajes basados en el chat_id
            const messagesResult = await connection.query('SELECT role, content FROM messages WHERE chat_id = ?', [chat.id]);

            // Agrega el chat con sus mensajes al arreglo
            const chatWithMessages = {
                conversation_history: chat,
                messages: messagesResult,
            };

            chatsWithMessages.push(chatWithMessages);
        }

        return chatsWithMessages;
    } catch (error) {
        throw error;
    }
}

async function saveConversation(connection, requestData) {
    // Implementa la lógica para guardar la conversación en la base de datos
    const [result] = await connection.execute('INSERT INTO chats (date, sender, object) VALUES (?, ?, ?)', [
        requestData.date,
        requestData.sender,
        JSON.stringify(requestData),
    ]);
    const chatId = result[0].insertId;
    return chatId;
}

async function queryDB(connection, query, fields = undefined) {
    var result;
    if (fields !== undefined )
        result = await connection.query(query, [fields]);
    else
        result = await connection.query(query);
    return result;
}
