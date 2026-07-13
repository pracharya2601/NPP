import { gql } from 'graphql-tag';

export const shopApiExtensions = gql`
  enum NepalPaymentProviderCode {
    KHALTI
    ESEWA
    FONEPAY
  }

  type NepalPaymentFormField {
    name: String!
    value: String!
  }

  type NepalPaymentForm {
    action: String!
    fields: [NepalPaymentFormField!]!
  }

  type NepalPaymentInitiation {
    attemptId: ID!
    provider: NepalPaymentProviderCode!
    status: String!
    redirectUrl: String
    qrPayload: String
    expiresAt: DateTime
    form: NepalPaymentForm
  }

  extend type Mutation {
    initiateNepalPayment(provider: NepalPaymentProviderCode!): NepalPaymentInitiation!
  }
`;
