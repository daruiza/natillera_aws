db.createCollection("roles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "name", "permissions"],
      properties: {
        _id: { bsonType: "objectId" },
        name: { enum: ["administrator", "member", "borrower"] },
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
      required: ["_id", "name", "email", "password_hash", "phone_number", "role_id", "status", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        name: { bsonType: "string", minLength: 1 },
        email: { bsonType: "string", minLength: 3 },
        password_hash: { bsonType: "string", minLength: 20 },
        phone_number: { bsonType: "string", minLength: 1 },
        role_id: { bsonType: "objectId" },
        status: { enum: ["active", "disabled"] },
        created_at: { bsonType: "date" },
        bank_accounts: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["bank_name", "account_number", "account_type"],
            properties: {
              bank_name: { bsonType: "string", minLength: 1 },
              account_number: { bsonType: "string", minLength: 1 },
              account_type: { enum: ["checking", "savings", "other"] },
              is_primary: { bsonType: "bool" },
            },
          },
        },
      },
    },
  },
});

db.createCollection("natilleras", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "name", "currency", "minimum_contribution_minor", "contribution_due_day", "contribution_notification_day", "status", "created_by", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        name: { bsonType: "string", minLength: 1 },
        currency: { enum: ["COP"] },
        minimum_contribution_minor: { bsonType: ["int", "long"], minimum: 0 },
        contribution_due_day: { bsonType: ["int", "long"], minimum: 1, maximum: 31 },
        contribution_notification_day: { bsonType: ["int", "long"], minimum: 1, maximum: 31 },
        status: { enum: ["active", "blocked", "closed"] },
        created_by: { bsonType: "objectId" },
        created_at: { bsonType: "date" },
      },
    },
  },
});

db.createCollection("memberships", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "natillera_id", "user_id", "status", "joined_at"],
      properties: {
        _id: { bsonType: "objectId" },
        natillera_id: { bsonType: "objectId" },
        user_id: { bsonType: "objectId" },
        status: { enum: ["active", "suspended", "left"] },
        joined_at: { bsonType: "date" },
      },
    },
  },
});

db.createCollection("accounts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "natillera_id", "membership_id", "account_number", "currency", "status", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        natillera_id: { bsonType: "objectId" },
        membership_id: { bsonType: "objectId" },
        account_number: { bsonType: "string", minLength: 1 },
        currency: { enum: ["COP"] },
        status: { enum: ["active", "blocked", "closed"] },
        created_at: { bsonType: "date" },
        closed_at: { bsonType: "date" },
      },
    },
  },
});

db.createCollection("natillera_bank_accounts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "natillera_id", "bank_name", "account_number", "account_type", "currency", "status", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        natillera_id: { bsonType: "objectId" },
        bank_name: { bsonType: "string", minLength: 1 },
        account_number: { bsonType: "string", minLength: 1 },
        account_type: { enum: ["checking", "savings", "digital_wallet", "other"] },
        currency: { enum: ["COP"] },
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
      required: ["_id", "natillera_id", "type", "status", "currency", "account_id", "amount_minor", "occurred_at", "created_at", "created_by", "idempotency_key"],
      oneOf: [
        {
          properties: { type: { enum: ["transfer"] } },
          required: ["destination_account_id"],
        },
        {
          properties: {
            type: {
              enum: ["deposit", "withdrawal", "loan_disbursement", "loan_repayment", "fee", "reversal"],
            },
          },
        },
      ],
      properties: {
        _id: { bsonType: "objectId" },
        natillera_id: { bsonType: "objectId" },
        type: {
          enum: ["deposit", "withdrawal", "transfer", "loan_disbursement", "loan_repayment", "fee", "reversal"],
        },
        status: { enum: ["pending", "posted", "rejected", "reversed"] },
        currency: { enum: ["COP"] },
        account_id: { bsonType: "objectId" },
        destination_account_id: { bsonType: "objectId" },
        natillera_bank_account_id: { bsonType: "objectId" },
        amount_minor: { bsonType: ["int", "long"], minimum: 1 },
        occurred_at: { bsonType: "date" },
        created_at: { bsonType: "date" },
        posted_at: { bsonType: "date" },
        created_by: { bsonType: "objectId" },
        idempotency_key: { bsonType: "string", minLength: 1 },
        description: { bsonType: "string" },
        reference: { bsonType: "string" },
        loan_id: { bsonType: "objectId" },
        loan_installment_id: { bsonType: "objectId" },
        reverses_transaction_id: { bsonType: "objectId" },
      },
    },
  },
});

db.createCollection("loans", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "natillera_id", "membership_id", "account_id", "principal_minor", "currency", "monthly_rate_bps", "term_months", "requested_at", "status", "created_by"],
      properties: {
        _id: { bsonType: "objectId" },
        natillera_id: { bsonType: "objectId" },
        membership_id: { bsonType: "objectId" },
        account_id: { bsonType: "objectId" },
        principal_minor: { bsonType: ["int", "long"], minimum: 1 },
        currency: { enum: ["COP"] },
        monthly_rate_bps: { bsonType: ["int", "long"], minimum: 0 },
        term_months: { bsonType: ["int", "long"], minimum: 1 },
        requested_at: { bsonType: "date" },
        approved_at: { bsonType: "date" },
        disbursed_at: { bsonType: "date" },
        due_at: { bsonType: "date" },
        status: { enum: ["requested", "approved", "rejected", "disbursed", "paid"] },
        created_by: { bsonType: "objectId" },
      },
    },
  },
});

db.createCollection("collaterals", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "natillera_id", "loan_id", "barcode", "description", "storage_location", "status", "received_at", "received_by"],
      properties: {
        _id: { bsonType: "objectId" },
        natillera_id: { bsonType: "objectId" },
        loan_id: { bsonType: "objectId" },
        barcode: { bsonType: "string", minLength: 1 },
        description: { bsonType: "string", minLength: 1 },
        storage_location: { bsonType: "string", minLength: 1 },
        status: { enum: ["held", "returned"] },
        received_at: { bsonType: "date" },
        received_by: { bsonType: "objectId" },
        returned_at: { bsonType: "date" },
        returned_by: { bsonType: "objectId" },
      },
    },
  },
});

db.createCollection("withdrawal_requests", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "natillera_id", "membership_id", "account_id", "amount_minor", "status", "requested_at"],
      properties: {
        _id: { bsonType: "objectId" },
        natillera_id: { bsonType: "objectId" },
        membership_id: { bsonType: "objectId" },
        account_id: { bsonType: "objectId" },
        amount_minor: { bsonType: ["int", "long"], minimum: 1 },
        status: { enum: ["requested", "approved", "rejected", "executed"] },
        reason: { bsonType: "string" },
        requested_at: { bsonType: "date" },
        decided_by: { bsonType: "objectId" },
        decided_at: { bsonType: "date" },
        executed_transaction_id: { bsonType: "objectId" },
      },
    },
  },
});

db.createCollection("loan_installments", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "loan_id", "installment_number", "due_at", "principal_minor", "interest_minor", "amount_due_minor", "amount_paid_minor", "status"],
      properties: {
        _id: { bsonType: "objectId" },
        loan_id: { bsonType: "objectId" },
        installment_number: { bsonType: ["int", "long"], minimum: 1 },
        due_at: { bsonType: "date" },
        principal_minor: { bsonType: ["int", "long"], minimum: 0 },
        interest_minor: { bsonType: ["int", "long"], minimum: 0 },
        amount_due_minor: { bsonType: ["int", "long"], minimum: 1 },
        amount_paid_minor: { bsonType: ["int", "long"], minimum: 0 },
        status: { enum: ["pending", "partially_paid", "paid"] },
        paid_at: { bsonType: "date" },
      },
    },
  },
});

db.createCollection("operation_evidences", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "transaction_id", "object_key", "file_name", "content_type", "size_bytes", "uploaded_by", "uploaded_at"],
      properties: {
        _id: { bsonType: "objectId" },
        transaction_id: { bsonType: "objectId" },
        object_key: { bsonType: "string", minLength: 1 },
        file_name: { bsonType: "string", minLength: 1 },
        content_type: { enum: ["image/jpeg", "image/png", "application/pdf"] },
        size_bytes: { bsonType: ["int", "long"], minimum: 1, maximum: 10485760 },
        uploaded_by: { bsonType: "objectId" },
        uploaded_at: { bsonType: "date" },
      },
    },
  },
});

db.createCollection("notifications", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "user_id", "type", "channel", "status", "entity_type", "entity_id", "scheduled_at"],
      properties: {
        _id: { bsonType: "objectId" },
        user_id: { bsonType: "objectId" },
        type: { enum: ["contribution_reminder", "installment_due", "installment_overdue"] },
        channel: { enum: ["in_app", "sms"] },
        status: { enum: ["pending", "sent", "failed", "cancelled"] },
        entity_type: { enum: ["natillera", "loan", "loan_installment"] },
        entity_id: { bsonType: "objectId" },
        scheduled_at: { bsonType: "date" },
        sent_at: { bsonType: "date" },
      },
    },
  },
});

db.users.createIndex({ email: 1 }, { unique: true });
db.roles.createIndex({ name: 1 }, { unique: true });
db.natilleras.createIndex({ name: 1 });
db.memberships.createIndex({ natillera_id: 1, user_id: 1 }, { unique: true });
db.accounts.createIndex({ membership_id: 1 }, { unique: true });
db.accounts.createIndex({ natillera_id: 1, account_number: 1 }, { unique: true });
db.natillera_bank_accounts.createIndex({ natillera_id: 1, bank_name: 1, account_number: 1 }, { unique: true });
db.transactions.createIndex({ natillera_id: 1, idempotency_key: 1 }, { unique: true });
db.transactions.createIndex({ natillera_id: 1, account_id: 1, occurred_at: -1 });
db.transactions.createIndex({ natillera_id: 1, destination_account_id: 1, occurred_at: -1 });
db.transactions.createIndex({ natillera_id: 1, natillera_bank_account_id: 1, occurred_at: -1 });
db.loans.createIndex({ natillera_id: 1, membership_id: 1, status: 1 });
db.collaterals.createIndex({ loan_id: 1 }, { unique: true });
db.collaterals.createIndex({ barcode: 1 }, { unique: true });
db.withdrawal_requests.createIndex({ natillera_id: 1, membership_id: 1, status: 1 });
db.loan_installments.createIndex({ loan_id: 1, installment_number: 1 }, { unique: true });
db.loan_installments.createIndex({ due_at: 1, status: 1 });
db.operation_evidences.createIndex({ transaction_id: 1 });
db.notifications.createIndex({ user_id: 1, scheduled_at: 1, status: 1 });