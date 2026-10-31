import {it,expect} from 'vitest';
import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import App from './App.jsx';
it('renders the landing page and the create-investigation actions',()=>{render(<MemoryRouter><App/></MemoryRouter>);expect(screen.getByRole('heading',{name:/every clue tells a story/i})).toBeInTheDocument();expect(screen.getByRole('link',{name:/start an investigation/i})).toHaveAttribute('href','/create')});
