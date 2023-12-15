'use server';

import { getClient } from '@/lib/client';
import {
    ApproveRequestMutation,
    DeleteRequestMutation,
} from '@/graphql/__generated__/graphql';
import { APPROVE_REQUEST, DELETE_REQUEST } from '@/graphql/queries/request';
import { revalidatePath } from 'next/cache';

export async function deleteRequest(id: string) {
    console.log('deleteRequest(): id=', id);
    const request = await getClient().mutate<DeleteRequestMutation>({
        fetchPolicy: 'no-cache',
        mutation: DELETE_REQUEST,
        variables: {
            id: id,
        },
    });

    revalidatePath('/requests');
    return request;
}

// TODO: check what does it take to use string as an id
export async function approveRequest(id: string) {
    console.log('approveRequest(): id=', id);
    const request = await getClient().mutate<ApproveRequestMutation>({
        fetchPolicy: 'no-cache',
        mutation: APPROVE_REQUEST,
        variables: {
            id: Number(id),
            input: {
                approvedBy: 'Admin',
                approvedComment: 'Manual testing of approvals',
            },
        },
    });

    revalidatePath('/requests');
    return request;
}
