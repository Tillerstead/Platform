/**
 * NJ Home Improvement Contractor Compliance Constants
 * Based on NJSA 56:8-136 et seq. (Consumer Fraud Act — Home Improvement Practices)
 *
 * These constants enforce NJ-specific legal requirements for contractor operations.
 * All contract generation, estimate formatting, and job workflows must reference these.
 */

/** NJ Division of Consumer Affairs — HIC regulatory framework */
export const NJ_HIC = Object.freeze({
  // Tillerstead LLC HIC registration
  LICENSE_NUMBER: '13VH10808800',
  LEGAL_ENTITY: 'Tillerstead LLC',
  LICENSING_BODY: 'NJ Division of Consumer Affairs',
  STATUTE: 'NJSA 56:8-136',

  // Contract requirements
  MIN_CONTRACT_AMOUNT: 500, // Contracts >$500 require written agreement
  RIGHT_TO_CANCEL_DAYS: 3, // 3-business-day right to cancel
  MAX_DEPOSIT_RATIO: 1 / 3, // Max 1/3 of total contract as deposit

  // License renewal tracking
  LICENSE_WARNING_DAYS: [60, 30, 7], // Days before expiration to alert

  // Lead paint (EPA RRP Rule + NJ requirements)
  LEAD_PAINT_CUTOFF_YEAR: 1978,
  EPA_RRP_CERT_REQUIRED: true,

  // NJ energy code
  ENERGY_CODE: 'NJ UCC — Sub-chapter 12 (Energy)',

  // Permit thresholds (varies by municipality, these are common minimums)
  PERMIT_REQUIRED_THRESHOLD: 0, // Always check — most tile/bath work needs permits in NJ
});

/** Job status workflow */
export const JOB_STATUSES = Object.freeze([
  'lead', // Initial inquiry
  'estimated', // Estimate provided
  'contracted', // Contract signed
  'permitted', // Permits pulled (if required)
  'scheduled', // On the calendar
  'in_progress', // Work underway
  'punch_list', // Final items / walkthrough
  'completed', // Work done, awaiting final payment
  'closed', // Fully paid and closed
  'cancelled', // Cancelled by either party
]);

/** Estimate line item categories */
export const ESTIMATE_CATEGORIES = Object.freeze([
  'tile',
  'mortar',
  'grout',
  'waterproofing',
  'backer_board',
  'self_leveler',
  'trim',
  'labor',
  'demolition',
  'disposal',
  'permit_fees',
  'miscellaneous',
]);

/** Change order reasons */
export const CHANGE_ORDER_REASONS = Object.freeze([
  'unforeseen_condition',
  'client_request',
  'material_substitution',
  'code_requirement',
  'scope_addition',
  'scope_reduction',
  'error_correction',
]);

/**
 * Validate a contract meets NJ HIC requirements.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateContract(contract) {
  const errors = [];

  if (!contract.hic_number) {
    errors.push('Contract must display HIC registration number (NJSA 56:8-136)');
  }

  if (!contract.contractor_name || !contract.contractor_address) {
    errors.push('Contract must include contractor name and business address');
  }

  if (!contract.homeowner_name || !contract.homeowner_address) {
    errors.push('Contract must include homeowner name and property address');
  }

  if (!contract.scope_of_work || contract.scope_of_work.length < 10) {
    errors.push('Contract must include detailed scope of work');
  }

  if (!contract.total_price || contract.total_price <= 0) {
    errors.push('Contract must state total price');
  }

  if (contract.total_price > NJ_HIC.MIN_CONTRACT_AMOUNT) {
    if (!contract.start_date || !contract.estimated_completion) {
      errors.push('Contracts over $500 must include start and estimated completion dates');
    }
  }

  if (contract.deposit && contract.total_price) {
    if (contract.deposit > contract.total_price * NJ_HIC.MAX_DEPOSIT_RATIO) {
      errors.push(
        `Deposit cannot exceed 1/3 of total contract price ($${(contract.total_price * NJ_HIC.MAX_DEPOSIT_RATIO).toFixed(2)})`
      );
    }
  }

  if (!contract.right_to_cancel_notice) {
    errors.push('Contract must include 3-business-day right to cancel notice');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if a property requires lead paint disclosure.
 */
export function requiresLeadPaintDisclosure(yearBuilt) {
  if (!yearBuilt || typeof yearBuilt !== 'number') return true; // Default to requiring it
  return yearBuilt < NJ_HIC.LEAD_PAINT_CUTOFF_YEAR;
}

/**
 * Calculate maximum allowed deposit for a contract amount.
 */
export function maxDeposit(totalPrice) {
  return Math.floor(totalPrice * NJ_HIC.MAX_DEPOSIT_RATIO * 100) / 100;
}

/**
 * Generate right-to-cancel notice text (required by NJ law).
 */
export function rightToCancelNotice() {
  return `NOTICE OF RIGHT TO CANCEL

You, the buyer, may cancel this transaction at any time prior to midnight of the third business day after the date of this transaction. See the attached notice of cancellation form for an explanation of this right.

This notice is provided in compliance with ${NJ_HIC.STATUTE} and the Federal Trade Commission's Cooling-Off Rule (16 CFR Part 429).`;
}
