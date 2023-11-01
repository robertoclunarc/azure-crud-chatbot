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
                const messages = await getMessagesForSender(connection, sender);
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

            connection.end();
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

async function getMessagesForSender(connection, sender) {
    // Implementa la lógica para obtener mensajes de la base de datos
    const result = await connection.query('SELECT a.*, b.* FROM chats a inner join azuredbchatbot.messages b on a.id=b.chat_id WHERE a.sender = ? order by b.id', [sender]);
    return result;
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
