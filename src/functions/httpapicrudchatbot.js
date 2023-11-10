const { app } = require('@azure/functions');
const mysql = require('promise-mysql');

app.http('httpapicrudchatbot', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
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
                //context.log(request.query.getAll)
                const messages = await getChatsWithMessages(connection,  sender);
                context.res = {
                    body: JSON.stringify(messages),
                };
            } else if (request.method === 'POST') {
                    // Manejar solicitud POST para guardar mensajes
                    try {
                      const requestData = JSON.parse(await request.text());
                  
                      const values = [requestData.date, requestData.sender, requestData.object];

                      let insertToDatabase;
                      //const messagesExits = await getChatsWithMessages(connection, requestData.sender)
                      const messagesExits = await queryDB(connection, 'SELECT * FROM chats WHERE sender = ? order by id', requestData.sender);
                      
                      if(messagesExits.length===0){
                        
                        insertToDatabase = await saveChats(connection, values);
                        const valuesMessages = [insertToDatabase?.insertId,requestData.role, requestData.message ];
                        const insertMessage = await saveMessage(connection, valuesMessages);
                        context.res = {
                            body: {
                                message:'Guardado satisfactoriamente',
                                idMessage: insertMessage.insertId
                            }
                        }
                      }else{
                        
                        //const chat_id = await messagesExits.messages[0].conversation_history[0].chat;
                        const chat_id = await messagesExits[0].id;
                        const valuesMessages = [chat_id,requestData.role, requestData.message ];
                        const insertMessage = await saveMessage(connection, valuesMessages);
                        connection
                        context.res = {
                            body: {
                                message:'Guardado satisfactoriamente',
                                idMessage: insertMessage.insertId
                            }
                        }
                        context.log(messagesExits[0]);
                      }
                    } catch (error) {
                      console.error('Error al procesar la solicitud:', error);
                      context.res = {
                        status: 500,
                        body: 'Error en el servidor'
                      };
                    }
                  }
                  
            else {
                context.res = {
                    status: 405,
                };
            }

            await connection.end();
        } catch (error) {
            context.error(`Error en la conexión a la base de datos: ${error.message}`);
            context.res = {
                status: 500,
                body: `Error en la conexión a la base de datos: ${error.message}`,
            };
        }

        return context.res;
    }
});

async function getChatsWithMessages(connection, sender) {
    try {
        // Realiza la primera consulta para obtener chats del sender
        const chatsResult = await connection.query('SELECT date, id FROM chats WHERE sender = ?', [sender]);

        var chatsWithMessages = [];

        for await(const chat of chatsResult) {
            // Realiza la segunda consulta para obtener mensajes basados en el chat_id
            const messagesResult = await connection.query('SELECT role, content FROM messages WHERE chat_id = ?', [chat.id]);

            // Agrega el chat con sus mensajes al arreglo
            const chatWithMessages = {
                date: chat.date,
                conversation_history: messagesResult,
            };

            chatsWithMessages.push(chatWithMessages);
        }

        const requestBody = {
            messages: chatsWithMessages,
            max_tokens: 1000,
            temperature: 0.5,
            max_tokens: 1000,
            temperature: 0.5,
            frequency_penalty: 0,
            presence_penalty: 0,
            top_p: 0.95,
            stop: null,
        };

        return requestBody;
    } catch (error) {
        throw error;
    }
}

const saveChats = (connection, values) => {
    const insertQuery = 'INSERT INTO chats (date, sender, object) VALUES (?, ?, ?)';
    return new Promise((resolve, reject) => {
      connection.query(insertQuery, values, (err, results) => {
        if (err) {
          console.error('Error al ejecutar la consulta SQL:', err);
          reject(err);
        } else {
          console.log('Chats insertados con éxito:');
          resolve(results);
        }
      });
    });
  };
  const saveMessage = (connection, values) => {
    const insertQuery = 'INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)';
    return new Promise((resolve, reject) => {
      connection.query(insertQuery, values, (err, results) => {
        if (err) {
          console.error('Error al ejecutar la consulta SQL:', err);
          reject(err);
        } else {
          console.log('Mensajes insertados con éxito:');
          resolve(results);
        }
      });
    });
  };
  

async function queryDB(connection, query, fields = undefined) {
    let result = [];
    if (fields !== undefined ){
        result = await connection.query(query, [fields]);
    }
    else{
        result = await connection.query(query);
    }
    //return Array.from(result);
    return result;
}
