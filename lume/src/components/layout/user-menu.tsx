"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, LogOut, Settings, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { demoCompany, demoUser } from "@/lib/mock";
import { useSession } from "@/hooks/use-session";
import { initials } from "@/lib/format";

export function UserMenu() {
  const router = useRouter();
  const { logout } = useSession();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu do usuário"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
      >
        <Avatar>
          <AvatarFallback
            className="text-white"
            style={{ backgroundColor: demoUser.avatarColor }}
          >
            {initials(demoUser.name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium text-foreground">{demoUser.name}</p>
          <p className="text-xs text-muted-foreground">{demoUser.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/configuracoes">
            <UserRound /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/selecionar-empresa">
            <Building2 /> Trocar de loja
            <span className="ml-auto text-xs text-muted-foreground">
              {demoCompany.tradeName}
            </span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/configuracoes">
            <Settings /> Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            logout();
            router.push("/login");
          }}
        >
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
