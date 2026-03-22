# SCHEMA: restaurantes

Todo lo relacionado a la operación del restaurante vive aquí.  
El schema separa claramente:

- auth.* → autenticación, usuarios, permisos  
- restaurantes.* → negocio, mesas, menús, pedidos  

Esto es buena arquitectura.

---

# 1. Tabla: restaurantes.owners

```sql
CREATE TABLE restaurantes.owners (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);
```

➕ ¿Para qué sirve?

Esta tabla originalmente existía en tu estructura, pero ya no se usa, porque ahora los usuarios se manejan en auth.users.

Recomendación: eliminarla si no tiene propósito.

Si quieres mantenerla, entonces representaría dueños externos, pero ya no es necesaria.

---

# 2. Tabla: restaurantes.restaurants

```sql
CREATE TABLE restaurantes.restaurants (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    address TEXT NOT NULL
);
```

➕ ¿Para qué sirve?

Guarda la información de cada restaurante registrado por un usuario.

Campos importantes:

- owner_id → referencia al usuario en auth.users  
- name → nombre del restaurante  
- address → dirección del local  

✔ Un usuario puede tener muchos restaurantes  
✔ Un restaurante siempre pertenece a un usuario  

---

# 3. Tabla: restaurantes.tables

```sql
CREATE TABLE restaurantes.tables (
    id UUID PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurantes.restaurants(id),
    number INT NOT NULL,
    capacity INT NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE
);
```

➕ ¿Para qué sirve?

Representa las mesas del restaurante.

Campos:

- restaurant_id → a qué restaurante pertenece  
- number → número de mesa  
- capacity → cuántas personas  
- is_available → si está libre  

✔ Un restaurante tiene muchas mesas  
✔ Una mesa pertenece a un solo restaurante  

---

# 4. Tabla: restaurantes.menu_items

```sql
CREATE TABLE restaurantes.menu_items (
    id UUID PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurantes.restaurants(id),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
```

➕ ¿Para qué sirve?

Guarda los platos o productos del menú.

Campos:

- restaurant_id → qué restaurante lo ofrece  
- name → nombre del plato  
- description → texto opcional  
- price → precio  
- is_active → si está en el menú actual o está oculto  

✔ Un restaurante tiene muchos items de menú  
✔ Un item de menú pertenece a un restaurante  

---

# 5. Tabla: restaurantes.orders

```sql
CREATE TABLE restaurantes.orders (
    id UUID PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    table_id UUID NOT NULL,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

➕ ¿Para qué sirve?

Almacena los pedidos realizados por los trabajadores del restaurante.

Campos:

- restaurant_id  
- table_id  
- total  
- status  
- created_at  

✔ Un pedido pertenece a una mesa  
✔ Una mesa puede tener muchos pedidos  
✔ El total se recalcula según sus items  

---

# 6. Tabla: restaurantes.order_items

```sql
CREATE TABLE restaurantes.order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,
    menu_item_id UUID NOT NULL,
    quantity INT NOT NULL,
    price NUMERIC(10,2) NOT NULL
);
```

➕ ¿Para qué sirve?

Son los productos individuales dentro del pedido.

Campos:

- order_id  
- menu_item_id  
- quantity  
- price  

✔ Un pedido puede tener muchos order_items  
✔ Cada item se registra con su cantidad y precio individual  

---

# Conexiones

```
auth.users  (dueño)
      ↓ owner_id
restaurantes.restaurants
      ↓ restaurant_id
restaurantes.tables
      ↓ table_id
restaurantes.orders
      ↓ order_id
restaurantes.order_items
      ↑ menu_item_id
restaurantes.menu_items
```

---

# Tabla: restaurantes.restaurant_special_closure

Ejemplos:

Cierre total por feriado:
- start: 2025-12-24  
- end: 2025-12-25  
- full_day: true  

Horario especial por evento:
- start: 2025-07-15  
- end: 2025-07-15  
- full_day: false  
- open: 17:00  
- close: 23:00  
- reason: "Evento privado"  

Mantenimiento de varios días:
- start: 2025-09-01  
- end: 2025-09-03  
- full_day: true  
- reason: "Reformas"  

---

# Tabla: restaurantes.restaurant_hours

Ejemplos:

- Lunes 10:00–18:00 → weekday=0, open=10:00, close=18:00  
- Viernes hasta las 02:00 → weekday=4, open=18:00, close=02:00  
- Domingo cerrado → weekday=6, is_closed=true  

Si `close < open`, significa que cierra al día siguiente.