import type {FormOnyxKeys} from '@components/Form/types';
import useStepFormSubmit from '@hooks/useStepFormSubmit';
import type {OnyxFormKey} from '@src/ONYXKEYS';
import ONYXKEYS from '@src/ONYXKEYS';
import type {SubStepProps} from './useSubStep/types';

type UseWalletAdditionalDetailsStepFormSubmitParams = Pick<SubStepProps, 'onNext'> & {
    formId?: OnyxFormKey;
    fieldIds: Array<FormOnyxKeys<typeof ONYXKEYS.FORMS.WALLET_ADDITIONAL_DETAILS>>;
    shouldSaveDraft: boolean;
};

/**
 * Hook for handling submit method in WalletAdditionalDetails substeps.
 * When user is in editing mode we should save values only when user confirm that
 * @param onNext - callback
 * @param fieldIds - field IDs for particular step
 * @param shouldSaveDraft - if we should save draft values
 */
export default function useWalletAdditionalDetailsStepFormSubmit({onNext, fieldIds, shouldSaveDraft}: UseWalletAdditionalDetailsStepFormSubmitParams) {
    return useStepFormSubmit<typeof ONYXKEYS.FORMS.WALLET_ADDITIONAL_DETAILS>({
        formId: ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM,
        onNext,
        fieldIds,
        shouldSaveDraft,
    });
}
