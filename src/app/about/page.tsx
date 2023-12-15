import { options } from '@/app/api/auth/[...nextauth]/config';
import { getServerSession } from 'next-auth';
import Card from '@/components/user/UserCard';

export default async function About() {
    const session = await getServerSession(options);

    if (session?.user.role !== 'admin') {
        return <h1 className="text-red-950">Access Denied!</h1>;
    }

    return (
        <>
            {session ? (
                <Card pagetype={'About'} user={session?.user} />
            ) : (
                <h1>Your session is not active</h1>
            )}
        </>
    );
}
