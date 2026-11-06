db.createCollection("roles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "name", "permissions"],
      properties: {
        _id: { bsonType: "objectId" },
        name: { bsonType: "string", minLength: 1 },
        permissions: {
          bsonType: "array",
          minItems: 1,
          uniqueItems: true,
          items: { bsonType: "string", minLength: 1 },
        },
      },
    },
  },
});

db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "name", "email", "password_hash", "role_id", "status", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        name: { bsonType: "string", minLength: 1 },
        email: { bsonType: "string", minLength: 3 },
        password_hash: { bsonType: "string", minLength: 20 },
        role_id: { bsonType: "objectId" },
        status: { enum: ["active", "disabled"] },
        created_at: { bsonType: "date" },
      },
    },
  },
});

db.createCollection("accounts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "account_number", "bank", "owner_id", "currency", "type", "status", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        account_number: { bsonType: "string", minLength: 1 },
        bank: { bsonType: "string", minLength: 1 },
        owner_id: { bsonType: "objectId" },
        currency: { bsonType: "string", pattern: "^[A-Z]{3}$" },
        type: { enum: ["checking", "savings", "cash", "clearing"] },
        status: { enum: ["active", "blocked", "closed"] },
        created_at: { bsonType: "date" },
        closed_at: { bsonType: "date" },
      },
    },
  },
});

db.createCollection("transactions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "type", "status", "currency", "account_id", "amount_minor", "occurred_at", "created_at", "created_by", "idempotency_key"],
      properties: {
        _id: { bsonType: "objectId" },
        type: {
          enum: ["deposit", "withdrawal", "transfer", "loan_disbursement", "loan_repayment", "fee", "reversal"],
        },
        status: { enum: ["pending", "posted", "rejected", "reversed"] },
        currency: { bsonType: "string", pattern: "^[A-Z]{3}$" },
        account_id: { bsonType: "objectId" },
        destination_account_id: { bsonType: "objectId" },
        amount_minor: { bsonType: ["int", "long"], minimum: 1 },
        occurred_at: { bsonType: "date" },
        created_at: { bsonType: "date" },
        posted_at: { bsonType: "date" },
        created_by: { bsonType: "objectId" },
        idempotency_key: { bsonType: "string", minLength: 1 },
        description: { bsonType: "string" },
        reference: { bsonType: "string" },
        loan_id: { bsonType: "objectId" },
        reverses_transaction_id: { bsonType: "objectId" },
      },
    },
  },
});

db.createCollection("loans", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "user_id", "account_id", "principal_minor", "currency", "monthly_rate_bps", "term_months", "issued_at", "due_at", "status", "created_by"],
      properties: {
        _id: { bsonType: "objectId" },
        user_id: { bsonType: "objectId" },
        account_id: { bsonType: "objectId" },
        principal_minor: { bsonType: ["int", "long"], minimum: 1 },
        currency: { bsonType: "string", pattern: "^[A-Z]{3}$" },
        monthly_rate_bps: { bsonType: ["int", "long"], minimum: 0 },
        term_months: { bsonType: ["int", "long"], minimum: 1 },
        issued_at: { bsonType: "date" },
        due_at: { bsonType: "date" },
        status: { enum: ["pending", "active", "paid", "defaulted", "cancelled"] },
        created_by: { bsonType: "objectId" },
      },
    },
  },
});

db.accounts.createIndex({ bank: 1, account_number: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.roles.createIndex({ name: 1 }, { unique: true });
db.transactions.createIndex({ idempotency_key: 1 }, { unique: true });
db.transactions.createIndex({ account_id: 1, occurred_at: -1 });
db.transactions.createIndex({ destination_account_id: 1, occurred_at: -1 });
db.loans.createIndex({ user_id: 1, status: 1 });