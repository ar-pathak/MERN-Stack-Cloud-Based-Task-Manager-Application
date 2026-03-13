import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Navbar from '../../../features/home/components/Navbar'

describe('Navbar', () => {
    it('renders the Aurora brand name', () => {
        render(<Navbar />)
        expect(screen.getByText('Aurora')).toBeInTheDocument()
    })

    it('renders the Workspace Platform subtitle', () => {
        render(<Navbar />)
        expect(screen.getByText('Workspace Platform')).toBeInTheDocument()
    })

    it('renders Product nav link', () => {
        render(<Navbar />)
        expect(screen.getByText('Product')).toBeInTheDocument()
    })

    it('renders Flow nav link', () => {
        render(<Navbar />)
        expect(screen.getByText('Flow')).toBeInTheDocument()
    })

    it('renders Preview nav link', () => {
        render(<Navbar />)
        expect(screen.getByText('Preview')).toBeInTheDocument()
    })

    it('renders Security nav link', () => {
        render(<Navbar />)
        expect(screen.getByText('Security')).toBeInTheDocument()
    })

    it('renders Sign in link', () => {
        render(<Navbar />)
        expect(screen.getByText('Sign in')).toBeInTheDocument()
    })

    it('renders Open Aurora button', () => {
        render(<Navbar />)
        expect(screen.getByText('Open Aurora')).toBeInTheDocument()
    })

    it('renders the mobile Open text', () => {
        render(<Navbar />)
        expect(screen.getByText('Open')).toBeInTheDocument()
    })

    it('has correct href for home link', () => {
        render(<Navbar />)
        const homeLink = screen.getByText('Aurora').closest('a')
        expect(homeLink).toHaveAttribute('href', '/home')
    })

    it('has correct href for Sign in link', () => {
        render(<Navbar />)
        const signInLink = screen.getByText('Sign in')
        expect(signInLink).toHaveAttribute('href', '/home/auth')
    })

    it('has correct href for Open Aurora link', () => {
        render(<Navbar />)
        const openLink = screen.getByText('Open Aurora').closest('a')
        expect(openLink).toHaveAttribute('href', '/main')
    })

    it('Product link points to #product-overview', () => {
        render(<Navbar />)
        const link = screen.getByText('Product')
        expect(link).toHaveAttribute('href', '#product-overview')
    })

    it('Flow link points to #how-aurora-works', () => {
        render(<Navbar />)
        const link = screen.getByText('Flow')
        expect(link).toHaveAttribute('href', '#how-aurora-works')
    })

    it('Preview link points to #live-preview', () => {
        render(<Navbar />)
        const link = screen.getByText('Preview')
        expect(link).toHaveAttribute('href', '#live-preview')
    })

    it('Security link points to #trust-security', () => {
        render(<Navbar />)
        const link = screen.getByText('Security')
        expect(link).toHaveAttribute('href', '#trust-security')
    })

    it('renders header element', () => {
        const { container } = render(<Navbar />)
        expect(container.querySelector('header')).toBeInTheDocument()
    })
})