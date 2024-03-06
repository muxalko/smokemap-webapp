'use server';

import { getClient } from '@/lib/client';
import {
    ApproveRequestMutation,
    DeleteRequestMutation,
    GetAllPlacesNamesQuery,
} from '@/graphql/__generated__/types';
import { APPROVE_REQUEST, DELETE_REQUEST, GET_S3_PRESIGNED_URL } from '@/graphql/queries/gql';
import { revalidatePath } from 'next/cache';
import { ALL_PLACES_NAMES_QUERY } from '@/graphql/queries/gql';
import logger from '@/lib/logger';
import { cookies } from 'next/headers';
import { CookieListItem } from 'next/dist/compiled/@edge-runtime/cookies';

export async function deleteRequest(id: string) {
    //console.log('deleteRequest(): id=', id);
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

export async function getS3PresignedUrl() {
    //console.log('getS3PresignedUrl()');
    const url = await getClient().query({
        fetchPolicy: 'no-cache',
        query: GET_S3_PRESIGNED_URL
    });
    
    return url;
}

// TODO: check what does it take to use string as an id
export async function approveRequest(id: string) {
    if (id.length === 0) return 'Error: Must provide request ID'
    logger.debug({id: id, type: typeof id },'approveRequest');
    const request = await getClient().mutate<ApproveRequestMutation>({
        fetchPolicy: 'no-cache',
        mutation: APPROVE_REQUEST,
        variables: {
            id: Number(id),
            input: {
                approvedBy: 'Admin',
                approvedComment: 'Manual approval',
            },
        },
    });

    revalidatePath('/requests');
    return request;
}

export async function search(search: string) {

    //console.log("searching for", search);
    if (search === "") return []
    
    const { data } = await getClient().query<GetAllPlacesNamesQuery>({
        // fetchPolicy: "cache-first",
        query: ALL_PLACES_NAMES_QUERY,
        //  context: {
        //     fetchOptions: {
        //         next: { revalidate: 5 },
        //     },
        // },
    });
    
    const placesNames = data.placesNames;
    // //console.log("All places list:",placesNames)
    const filteredNames = placesNames?.filter((name) => name?.toLowerCase().includes(search.toLowerCase()))
    // //console.log("Filtered Names:", filteredNames)
    return filteredNames?.slice(0, 10);
    // const pokemonData = await result.json();
    // return pokemonData.results
    //   .filter((p: { name: string }) =>
    //     p.name.toLowerCase().includes(search.toLowerCase())
    //   )
    //   .map((p: { name: string }) => p.name)
    //   .slice(0, 50);
  }

 export async function setCookie(data: CookieListItem) {

    const cookieStore = cookies();

    cookieStore.set(data);

    return data;
}

 export async function getCookie(name: string) {

    const cookieStore = cookies();

    return cookieStore.get(name);

}