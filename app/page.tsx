import Landing from "@/components/Landing";
import App from "@/components/App";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        return <App />;
    }

    return <Landing />;
}