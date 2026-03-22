auth 
#registrar usuarios en la suite
/auth/register
metodo POST
{
    "email": "daniel@gmail.com",
    "password": "@hola12345",
    "nombre": "angel",
    "apellido": "parra"
}

devuelve un 200 ok
con un json con los datos
{
    "id": "17a29f1c-d7e9-4ce5-8d5a-735572d3b9cf",
    "nombre": "angel",
    "apellido": "parra",
    "email": "daniel@gmail.com",
    "rol": "admin",
    "activo": true,
    "fecha_creacion": "2025-08-27T04:00:06.916422Z",
    "suscripcion": false,
    "tipo_suscripcion": null
}


#registrar usuarios en la suite
/auth/login
metodo POST
{
    "email": "angel@gmail.com",
    "password": "@hola12345"
   
}

devuelve un 200 ok
con un json con los datos

{
    "status": "success",
    "user": {
        "activo": true,
        "apellido": "parra",
        "email": "angel@gmail.com",
        "fecha_creacion": "2025-08-27T01:19:13.919066Z",
        "id": "46884422-f01a-40fe-ac2f-96691971b8d7",
        "nombre": "angel",
        "rol": "admin",
        "suscripcion": false,
        "tipo_suscripcion": null
    }
}
tambien crea el token en las cookies seguras 

api 

#consultar el estatus de un usuario 
/api/profile
metodo GET
se envia en la peticion el token en las cookies seguras y devuelve los datos del usuario autenticado
devuelve un 200 ok 
{
    "id": "46884422-f01a-40fe-ac2f-96691971b8d7",
    "nombre": "angel",
    "apellido": "parra",
    "email": "angel@gmail.com",
    "rol": "admin",
    "activo": true,
    "fecha_creacion": "2025-08-27T01:19:13.919066Z",
    "suscripcion": true,
    "tipo_suscripcion": "sub1"
}

#de momento activar una suscripcion del usuario 
/api/suscripcion
metodo POST
se envia la peticion con el token en cookies seguras y con el cuerpo json de la siguiente manera
{
    "tipo": "sub6",
    "metodo_pago": "paypal"
}
que devuelve el json 
{
    "message": "Suscripción creada correctamente",
    "suscripcion_id": "d18c0606-7407-433c-ad08-b08c7cfdad74",
    "tipo": "sub2"
}


