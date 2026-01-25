 import React from 'react';
 import { Moon, Sun } from 'lucide-react';
 import { useTheme } from 'next-themes';
 import { Button } from '@/components/ui/button';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
 import { useLanguage } from '@/contexts/LanguageContext';
 
 export function ThemeToggle() {
   const { theme, setTheme } = useTheme();
   const { language } = useLanguage();
 
   return (
     <DropdownMenu>
       <DropdownMenuTrigger asChild>
         <Button variant="ghost" size="icon" className="h-9 w-9">
           <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
           <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
           <span className="sr-only">Toggle theme</span>
         </Button>
       </DropdownMenuTrigger>
       <DropdownMenuContent align="end">
         <DropdownMenuItem onClick={() => setTheme('light')}>
           <Sun className="mr-2 h-4 w-4" />
           {language === 'es' ? 'Claro' : 'Light'}
         </DropdownMenuItem>
         <DropdownMenuItem onClick={() => setTheme('dark')}>
           <Moon className="mr-2 h-4 w-4" />
           {language === 'es' ? 'Oscuro' : 'Dark'}
         </DropdownMenuItem>
         <DropdownMenuItem onClick={() => setTheme('system')}>
           <span className="mr-2">💻</span>
           {language === 'es' ? 'Sistema' : 'System'}
         </DropdownMenuItem>
       </DropdownMenuContent>
     </DropdownMenu>
   );
 }