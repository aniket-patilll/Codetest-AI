import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Code, Users, Trophy, ChevronRight, Terminal, Cpu, Globe, Zap, CheckCircle2, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CodeEditor = () => {
  const [code, setCode] = useState('');
  const fullCode = `def two_sum(nums, target):
    """
    Finds indices of two numbers that
    add up to the target.
    """
    return []`;

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setCode(fullCode.slice(0, i));
      i++;
      if (i > fullCode.length) {
        clearInterval(interval);
      }
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-white/10 bg-[#1e1e1e] shadow-2xl overflow-hidden font-mono text-sm relative group h-[320px]">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* Window Controls */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#252526] shrink-0">
        <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
        <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        <div className="ml-4 text-xs text-gray-400 font-sans">challenge_01.py</div>
      </div>

      {/* Code Area */}
      <div className="p-4 overflow-auto h-[calc(100%-48px)]">
        <div className="font-mono text-[13px] leading-6">
            {code.split('\n').map((line, i) => (
              <div key={i} className="flex">
                <span className="select-none text-gray-600 text-right w-8 pr-4 shrink-0">{i + 1}</span>
                <pre className="text-gray-300 w-full font-mono">
                  {line.split(/(".*?"|'.*?')/).map((part, index) => {
                     // Simple syntax highlighting mock
                     if (part.startsWith('"') || part.startsWith("'")) return <span key={index} className="text-[#ce9178]">{part}</span>;
                     if (['def', 'return', 'print', 'for', 'in', 'if'].includes(part.trim())) return <span key={index} className="text-[#569cd6]">{part}</span>;
                     if (['#'].some(c => part.trim().startsWith(c))) return <span key={index} className="text-[#6a9955]">{part}</span>;
                     if (['two_sum', 'enumerate'].includes(part.trim().split('(')[0])) return <span key={index} className="text-[#dcdcaa]">{part}</span>;
                     return <span key={index}>{part}</span>;
                  })}
                </pre>
              </div>
            ))}
            <span className="animate-pulse inline-block w-2 h-4 bg-primary align-middle ml-[48px]"></span>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="p-6 rounded-2xl bg-card border border-white/5 hover:border-primary/50 transition-colors duration-300 group"
  >
    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
      <Icon className="w-6 h-6 text-primary" />
    </div>
    <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{description}</p>
  </motion.div>
);

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-background font-bold">
                <Terminal className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">CodeTest</span>
            </Link>

            <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Sign In
            </Link>
            <Button asChild className="bg-primary hover:bg-primary/90 text-background font-semibold">
                <Link to="/signup">Get Started</Link>
            </Button>
            </div>
            
            <button className="md:hidden p-2 text-gray-300" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X /> : <Menu />}
            </button>
        </div>
        
        {/* Mobile Menu */}
        <AnimatePresence>
            {isMenuOpen && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="md:hidden border-b border-white/5 bg-background overflow-hidden"
                >
                </motion.div>
            )}
        </AnimatePresence>
        </header>
    );
};

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      <Navbar />

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-4 lg:py-24 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Hero Text */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold mb-6">
                    <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    v1.0 Now Available
                </div>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
                Organize CodeTests <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-green-300">
                  With AI Power
                </span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
                The CodeTest organizing platform for HR's, recruiters, and educators.To 
                Conduct coding tests, evaluate candidates, and make hiring decisions with AI power.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-background font-bold h-12 px-8">
                  <Link to="/signup">
                    Start Coding Now <ChevronRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>

            {/* Hero Visual - Code Editor */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative perspective-1000"
            >
                <div className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                <CodeEditor />
                
                {/* Floating Elements */}
                <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -right-6 -top-6 p-4 rounded-xl bg-card border border-white/10 shadow-xl hidden md:block"
                >
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                </motion.div>
                <motion.div 
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute -left-6 -bottom-6 p-4 rounded-xl bg-card border border-white/10 shadow-xl hidden md:block"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs font-bold">All Tests Passed</span>
                    </div>
                </motion.div>
            </motion.div>

          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="container mx-auto px-4 py-24 relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10"></div>
            
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything you need to <span className="text-primary">evaluate</span></h2>
                <p className="text-lg text-muted-foreground">
                    Evaluate candidates with ease using our AI-powered platform. 
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FeatureCard 
                    icon={Code}
                    title="Python Language Support"
                    description="Write code in Python. Our runner supports Python with zero latency."
                    delay={0.1}
                />
                <FeatureCard 
                    icon={Zap}
                    title="Real-time Execution"
                    description="See results instantly. Our high-performance execution engine runs your code securely in milliseconds."
                    delay={0.2}
                />
                <FeatureCard 
                    icon={Cpu}
                    title="AI Code Analysis"
                    description="Get instant feedback on time complexity, memory usage, and code quality from our advanced AI models."
                    delay={0.3}
                />
                <FeatureCard 
                    icon={Trophy}
                    title="Competitive Contests"
                    description="Join weekly contests, climb the leaderboard, and showcase your skills to potential recruiters."
                    delay={0.4}
                />
                <FeatureCard 
                    icon={Globe}
                    title="AI Powered"
                    description="Our platform uses AI to evaluate candidates and provide instant feedback on their code."
                    delay={0.5}
                />
                <FeatureCard 
                    icon={Users}
                    title="No cheating"
                    description="No cheating. Our platform uses secure proctored environment wit no copy/paste,no tab switch, no clipboard access."
                    delay={0.6}
                />
            </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-24">
            <div className="rounded-3xl bg-gradient-to-b from-[#1e1e1e] to-black border border-white/10 p-8 md:p-16 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Host your contests?</h2>
                <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                    Host your contests and evaluate candidates with ease using our AI-powered platform.
                </p>
                <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-background font-bold text-lg px-8 py-6 h-auto">
                    <Link to="/signup">Get Started for Free</Link>
                </Button>
            </div>
        </section>

      </main>

      {/* Footer */}
      {/* <footer className="border-t border-white/10 bg-[#0a0a0a] py-12">
        <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-background">
                        <Terminal className="w-3 h-3" />
                    </div>
                    <span className="font-bold text-lg text-gray-200">CodeTest</span>
                </div>
                <div className="flex gap-8 text-sm text-gray-400">
                    <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                    <a href="#" className="hover:text-primary transition-colors">Terms</a>
                    <a href="#" className="hover:text-primary transition-colors">Twitter</a>
                    <a href="#" className="hover:text-primary transition-colors">GitHub</a>
                </div>
                <div className="text-sm text-gray-600">
                    © 2024 CodeTest Inc.
                </div>
            </div>
        </div>
      </footer> */}
    </div>
  );
};

export default Index;
