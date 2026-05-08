import { Box } from './components/Box';
import { Button } from './components/Button';
import { Chip } from './components/Chip';
import { Input } from './components/Input';
import { Check } from './components/Check';

export default function App() {
  return (
    <div className="min-h-full bg-paper p-6 max-w-md mx-auto space-y-4">
      <h1 className="font-display text-4xl">学不死 v0.0.1</h1>
      <p className="font-cn text-sm text-ink-2">组件预览</p>

      <Box variant="thick" className="p-4">
        <p className="font-cn text-sm">thick box + 立体阴影</p>
      </Box>
      <Box variant="soft" className="p-4">
        <p className="font-cn text-sm">soft box</p>
      </Box>
      <Box variant="dashed" className="p-4">
        <p className="font-cn text-sm">dashed box</p>
      </Box>

      <div className="flex gap-2 flex-wrap">
        <Button>default</Button>
        <Button variant="primary">primary</Button>
        <Button variant="accent">accent</Button>
        <Button variant="ghost">ghost</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Chip>普通</Chip>
        <Chip active>选中</Chip>
        <Chip>NPDP</Chip>
      </div>

      <Input placeholder="输入题干..." />

      <div className="flex items-center gap-2">
        <Check checked />
        <Check />
        <Check checked shape="circle" />
        <Check shape="circle" />
      </div>
    </div>
  );
}
